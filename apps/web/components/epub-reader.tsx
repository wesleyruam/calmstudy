"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { unzipSync, strFromU8 } from "fflate";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  Notebook,
  PanelRight,
  X,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingMark } from "@/components/logo";
import { StudySessionTracker } from "@/components/study-session-tracker";
import { ReaderStudyDock, HighlightMenu } from "@/components/reader-study-dock";
import { LayerSelector, type ReaderLayer } from "@/components/layer-selector";
import { DiscussionPanel } from "@/components/space-discussion-panel";
import { useReflowStudy } from "@/components/use-reflow-study";
import { applyHighlights, selectionRange, type TextAnchor } from "@/lib/reflow-highlight";
import { highlightColor, type HighlightCategory, type HighlightDTO } from "@/lib/highlight-shared";
import type { ReaderData } from "@/lib/reader";

// ─────────────────────────── Parsing do EPUB (cliente) ───────────────────────────
// EPUB = zip com um OPF (spine = ordem dos capítulos). Fazemos tudo no cliente,
// espelhando o leitor de PDF (que também busca o arquivo e renderiza no browser).

type Zip = Record<string, Uint8Array>;
type Chapter = { href: string; title: string };
type Epub = { zip: Zip; chapters: Chapter[]; hrefToIndex: Map<string, number> };

function parseXml(s: string): Document {
  return new DOMParser().parseFromString(s, "application/xml");
}

// Resolve um href relativo contra um diretório-base, tratando ../ e ./.
function resolvePath(baseDir: string, href: string): string {
  const clean = href.split("#")[0]!.split("?")[0]!;
  if (!clean) return baseDir;
  const parts = (baseDir ? baseDir.split("/") : []).filter(Boolean);
  for (const seg of clean.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== "." && seg !== "") parts.push(seg);
  }
  return parts.join("/");
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

// Busca no zip tolerando diferença de caixa (alguns EPUBs divergem).
function zipGet(zip: Zip, path: string): Uint8Array | undefined {
  if (zip[path]) return zip[path];
  const lower = path.toLowerCase();
  const key = Object.keys(zip).find((k) => k.toLowerCase() === lower);
  return key ? zip[key] : undefined;
}

function parseEpub(buf: ArrayBuffer): Epub {
  const zip = unzipSync(new Uint8Array(buf));

  // 1) container.xml → caminho do OPF
  const containerRaw = zipGet(zip, "META-INF/container.xml");
  if (!containerRaw) throw new Error("EPUB sem META-INF/container.xml.");
  const container = parseXml(strFromU8(containerRaw));
  const opfPath = container.querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("EPUB sem rootfile no container.");

  const opfRaw = zipGet(zip, opfPath);
  if (!opfRaw) throw new Error("OPF não encontrado no EPUB.");
  const opf = parseXml(strFromU8(opfRaw));
  const opfDir = dirOf(opfPath);

  // 2) manifest: id → { href, type }
  const manifest = new Map<string, { href: string; type: string }>();
  const navHrefs: string[] = [];
  opf.querySelectorAll("manifest > item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) return;
    const type = item.getAttribute("media-type") ?? "";
    manifest.set(id, { href, type });
    if ((item.getAttribute("properties") ?? "").split(/\s+/).includes("nav")) {
      navHrefs.push(resolvePath(opfDir, href));
    }
  });

  // 3) spine: ordem dos capítulos (só documentos de conteúdo)
  const chapters: Chapter[] = [];
  const hrefToIndex = new Map<string, number>();
  let ncxHref: string | undefined;
  const spine = opf.querySelector("spine");
  const tocId = spine?.getAttribute("toc");
  if (tocId) ncxHref = manifest.get(tocId)?.href
    ? resolvePath(opfDir, manifest.get(tocId)!.href)
    : undefined;

  spine?.querySelectorAll("itemref").forEach((ref) => {
    const idref = ref.getAttribute("idref");
    if (!idref) return;
    const item = manifest.get(idref);
    if (!item) return;
    const isDoc = /xhtml|html/.test(item.type) || /\.x?html?$/i.test(item.href);
    if (!isDoc) return;
    const full = resolvePath(opfDir, item.href);
    hrefToIndex.set(full, chapters.length);
    chapters.push({ href: full, title: "" });
  });

  if (chapters.length === 0) throw new Error("EPUB sem capítulos legíveis.");

  // 4) títulos via nav (EPUB3) ou toc.ncx (EPUB2)
  const titles = new Map<string, string>();
  for (const navHref of navHrefs) {
    const raw = zipGet(zip, navHref);
    if (!raw) continue;
    const nav = new DOMParser().parseFromString(strFromU8(raw), "text/html");
    nav.querySelectorAll("a[href]").forEach((a) => {
      const target = resolvePath(dirOf(navHref), a.getAttribute("href")!);
      const text = (a.textContent ?? "").trim();
      if (text && !titles.has(target)) titles.set(target, text);
    });
  }
  if (titles.size === 0 && ncxHref) {
    const raw = zipGet(zip, ncxHref);
    if (raw) {
      const ncx = parseXml(strFromU8(raw));
      ncx.querySelectorAll("navPoint").forEach((np) => {
        const src = np.querySelector("content")?.getAttribute("src");
        const text = (np.querySelector("navLabel > text")?.textContent ?? "").trim();
        if (src && text) {
          const target = resolvePath(dirOf(ncxHref!), src);
          if (!titles.has(target)) titles.set(target, text);
        }
      });
    }
  }

  chapters.forEach((c, i) => {
    c.title = titles.get(c.href) || `Capítulo ${i + 1}`;
  });

  return { zip, chapters, hrefToIndex };
}

const REMOVE = new Set(["script", "style", "link", "meta", "title", "iframe", "object", "embed", "base", "head"]);

// Sanitiza o XHTML do capítulo e devolve o HTML do corpo + blobs criados p/ imagens.
function renderChapter(epub: Epub, index: number): { html: string; blobs: string[] } {
  const chapter = epub.chapters[index]!;
  const raw = zipGet(epub.zip, chapter.href);
  if (!raw) return { html: "<p>Capítulo não encontrado.</p>", blobs: [] };

  const doc = new DOMParser().parseFromString(strFromU8(raw), "text/html");
  const baseDir = dirOf(chapter.href);
  const blobs: string[] = [];
  const blobCache = new Map<string, string>();

  const blobFor = (path: string, fallbackType: string): string | null => {
    if (blobCache.has(path)) return blobCache.get(path)!;
    const bytes = zipGet(epub.zip, path);
    if (!bytes) return null;
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const byExt: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
    };
    const type = byExt[ext] || fallbackType || "application/octet-stream";
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
    blobCache.set(path, url);
    blobs.push(url);
    return url;
  };

  // imagens: resolve src → blob (ou remove)
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    img.removeAttribute("srcset");
    if (!src) return img.remove();
    const url = blobFor(resolvePath(baseDir, src), "");
    if (url) img.setAttribute("src", url);
    else img.remove();
  });
  // SVG <image xlink:href>
  doc.querySelectorAll("image").forEach((im) => {
    const href = im.getAttribute("xlink:href") ?? im.getAttribute("href");
    if (!href) return;
    const url = blobFor(resolvePath(baseDir, href), "");
    if (url) {
      im.setAttribute("href", url);
      im.setAttribute("xlink:href", url);
    }
  });

  // links: internos viram salto de capítulo; externos abrem em nova aba
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href")!;
    if (/^https?:/i.test(href) || /^mailto:/i.test(href)) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return;
    }
    const target = resolvePath(baseDir, href);
    const idx = epub.hrefToIndex.get(target);
    if (idx !== undefined) {
      a.setAttribute("data-eref", String(idx));
      a.removeAttribute("href");
    } else {
      a.removeAttribute("href");
    }
  });

  // remove tags perigosas/decorativas e neutraliza atributos
  doc.querySelectorAll("*").forEach((el) => {
    if (REMOVE.has(el.tagName.toLowerCase())) {
      el.remove();
      return;
    }
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      // tira handlers, estilos e classes (o leitor impõe a própria tipografia)
      if (n.startsWith("on") || n === "style" || n === "class" || n === "bgcolor" || n === "align" || n === "width" || n === "height") {
        el.removeAttribute(attr.name);
      }
    }
  });

  return { html: doc.body?.innerHTML ?? "", blobs };
}

// ─────────────────────────────── Componente ───────────────────────────────

export function EpubReader({ data }: { data: ReaderData }) {
  const [epub, setEpub] = useState<Epub | null>(null);
  const [idx, setIdx] = useState(Math.max(0, data.lastPage || 0));
  const [html, setHtml] = useState("");
  // capítulo a que o `html` atual pertence — evita aplicar grifos no capítulo
  // errado no render transitório em que idx já mudou mas o html ainda é o antigo.
  const [htmlIdx, setHtmlIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [tocOpen, setTocOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const blobsRef = useRef<string[]>([]);
  const pendingScrollRef = useRef<string | null>(null); // id do grifo a rolar após trocar de capítulo

  const [sel, setSel] = useState<{ x: number; y: number; anchor: TextAnchor; text: string } | null>(null);
  const [layer, setLayer] = useState<ReaderLayer>("personal");
  const study = useReflowStudy(data.userBookId);

  const activeSpace =
    layer === "personal" || layer === "community" ? null : data.spaces.find((s) => s.id === layer) ?? null;
  const isCommunity = layer === "community";
  const showLayers = data.spaces.length > 0 || data.communityCount > 0;

  // preferências (tamanho da fonte)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("epub:prefs");
      if (raw) {
        const p = JSON.parse(raw) as { fontScale?: number };
        if (typeof p.fontScale === "number") setFontScale(Math.min(1.6, Math.max(0.8, p.fontScale)));
      }
    } catch {
      /* ignora */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("epub:prefs", JSON.stringify({ fontScale }));
    } catch {
      /* ignora */
    }
  }, [fontScale]);

  // carrega + parseia o EPUB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(data.fileUrl);
        if (!res.ok) throw new Error("Falha ao baixar o arquivo.");
        const buf = await res.arrayBuffer();
        const parsed = parseEpub(buf);
        if (cancelled) return;
        setEpub(parsed);
        setIdx((i) => Math.min(Math.max(0, i), parsed.chapters.length - 1));
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Não foi possível abrir o EPUB.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.fileUrl]);

  // renderiza o capítulo atual (e libera blobs anteriores)
  useEffect(() => {
    if (!epub) return;
    const { html: chapterHtml, blobs } = renderChapter(epub, idx);
    setHtml(chapterHtml);
    setHtmlIdx(idx);
    for (const url of blobsRef.current) URL.revokeObjectURL(url);
    blobsRef.current = blobs;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [epub, idx]);

  // revoga blobs ao desmontar
  useEffect(() => () => {
    for (const url of blobsRef.current) URL.revokeObjectURL(url);
  }, []);

  // persiste a posição (capítulo) — debounced
  useEffect(() => {
    if (!epub) return;
    const total = epub.chapters.length;
    const t = setTimeout(() => {
      void fetch(`/api/userbooks/${data.userBookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastPage: idx,
          progress: total ? (idx + 1) / total : 0,
          status: "READING",
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [idx, epub, data.userBookId]);

  const total = epub?.chapters.length ?? 0;
  const go = useCallback(
    (delta: number) => setIdx((i) => Math.min(Math.max(0, i + delta), Math.max(0, total - 1))),
    [total],
  );

  // teclado: ← → troca de capítulo (fora de campos de texto)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // clique: grifo → abre no painel; link interno → salto de capítulo
  const onContentClick = useCallback(
    (e: React.MouseEvent) => {
      const mark = (e.target as HTMLElement).closest("mark[data-hl-id]");
      if (mark) {
        const id = (mark as HTMLElement).dataset.hlId;
        const h = study.highlights.find((x) => x.id === id);
        if (h) {
          study.setActiveHighlight(h);
          setPanelOpen(true);
        }
        return;
      }
      const a = (e.target as HTMLElement).closest("a[data-eref]");
      if (!a) return;
      e.preventDefault();
      const target = Number(a.getAttribute("data-eref"));
      if (Number.isInteger(target)) setIdx(target);
    },
    [study],
  );

  // renderiza os grifos deste capítulo (offset → <mark>)
  useEffect(() => {
    if (loading || !articleRef.current) return;
    const renderable = study.highlights
      .map((h) => ({ id: h.id, anchor: h.anchor as unknown as TextAnchor, color: highlightColor(h) }))
      .filter((h) => h.anchor?.kind === "text" && h.anchor.chap === htmlIdx && typeof h.anchor.start === "number")
      .map((h) => ({ id: h.id, start: h.anchor.start, len: h.anchor.len, color: h.color }));
    applyHighlights(articleRef.current, renderable);
    // se pediram pra localizar um grifo (após trocar de capítulo), rola até ele
    if (pendingScrollRef.current) {
      const el = articleRef.current.querySelector(`mark[data-hl-id="${pendingScrollRef.current}"]`);
      if (el) {
        el.scrollIntoView({ block: "center" });
        pendingScrollRef.current = null;
      }
    }
  }, [loading, html, htmlIdx, study.highlights, fontScale, panelOpen]);

  // clicar num destaque na lista → vai ao capítulo/posição dele e abre a edição
  const locateHighlight = useCallback(
    (h: HighlightDTO) => {
      const anchor = h.anchor as unknown as { chap?: number };
      const chap = typeof anchor?.chap === "number" ? anchor.chap : idx;
      if (chap === idx) {
        articleRef.current?.querySelector(`mark[data-hl-id="${h.id}"]`)?.scrollIntoView({ block: "center" });
      } else {
        pendingScrollRef.current = h.id;
        setIdx(chap);
      }
      study.setActiveHighlight(h);
      setPanelOpen(true);
    },
    [idx, study],
  );

  // seleção de texto → menu de categorias
  const onSelectUp = useCallback(() => {
    const root = articleRef.current;
    if (!root) return;
    const r = selectionRange(root);
    if (!r) return setSel(null);
    setSel({
      x: r.rect.left + r.rect.width / 2,
      y: r.rect.top,
      text: r.text,
      anchor: { page: idx + 1, kind: "text", start: r.start, len: r.len, chap: idx },
    });
  }, [idx]);

  const addHighlight = useCallback(
    (category: HighlightCategory) => {
      if (!sel) return;
      void study.createHighlight(sel.text, sel.anchor, category);
      window.getSelection()?.removeAllRanges();
      setSel(null);
      setPanelOpen(true);
    },
    [sel, study],
  );

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const chapterTitle = epub?.chapters[idx]?.title ?? "";

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-paper)]">
      <StudySessionTracker userBookId={data.userBookId} page={idx + 1} />
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <Link href="/" className="shrink-0 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
            Biblioteca
          </Link>
          <span className="shrink-0 text-[var(--color-ink-soft)]">/</span>
          <span className="truncate font-medium">{data.title}</span>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title="Diminuir texto"
            aria-label="Diminuir texto"
          >
            <Minus className="size-4" />
          </button>
          <button
            onClick={() => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title="Aumentar texto"
            aria-label="Aumentar texto"
          >
            <Plus className="size-4" />
          </button>
          <ThemeToggle />
          <Link
            href={`/caderno/${data.userBookId}`}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title="Caderno do livro"
            aria-label="Caderno do livro"
          >
            <Notebook className="size-4" />
          </Link>
          <button
            onClick={toggleFullscreen}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
          {showLayers && (
            <LayerSelector
              spaces={data.spaces}
              community={data.communityCount > 0}
              value={layer}
              onChange={(l) => {
                setLayer(l);
                if (l !== "personal") {
                  study.setActiveHighlight(null);
                  setPanelOpen(true);
                }
              }}
            />
          )}
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              panelOpen ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
            ].join(" ")}
            title="Bancada de estudo"
            aria-label="Bancada de estudo"
          >
            <PanelRight className="size-4" />
          </button>
          <button
            onClick={() => setTocOpen((v) => !v)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              tocOpen ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
            ].join(" ")}
            title="Sumário"
            aria-label="Sumário"
          >
            <List className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div ref={scrollRef} onMouseUp={onSelectUp} className="flex-1 overflow-y-auto">
          {loading ? (
            <LoadingMark label="Abrindo documento…" className="mt-24" />
          ) : error ? (
            <div className="mx-auto mt-24 max-w-md px-6 text-center">
              <p className="font-serif text-lg">Não foi possível abrir este EPUB</p>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{error}</p>
            </div>
          ) : (
            <article
              ref={articleRef}
              className="epub-prose mx-auto max-w-2xl px-6 py-10"
              style={{ fontSize: `${fontScale}rem` }}
              onClick={onContentClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        {/* Sumário */}
        {tocOpen && epub && (
          <aside className="flex h-full w-80 max-w-[90vw] shrink-0 flex-col border-l border-[var(--color-line)] bg-[var(--color-surface)] max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-30 max-xl:shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
              <span className="flex-1 text-sm font-medium">Sumário</span>
              <button
                onClick={() => setTocOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
                aria-label="Fechar sumário"
              >
                <X className="size-4" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {epub.chapters.map((c, i) => (
                <li key={c.href + i}>
                  <button
                    onClick={() => {
                      setIdx(i);
                      setTocOpen(false);
                    }}
                    className={[
                      "block w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      i === idx
                        ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
                        : "text-[var(--color-ink-soft)] hover:bg-[var(--color-line)]/50",
                    ].join(" ")}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {panelOpen && !loading && !error &&
          (!study.activeHighlight && activeSpace ? (
            <DiscussionPanel
              mode="space"
              title={activeSpace.name}
              subtitle="Discussão"
              spaceId={activeSpace.id}
              page={idx + 1}
              onClose={() => setPanelOpen(false)}
            />
          ) : !study.activeHighlight && isCommunity ? (
            <DiscussionPanel
              mode="community"
              title="Comunidade"
              subtitle="Conhecimento público"
              bookId={data.bookId}
              page={idx + 1}
              onClose={() => setPanelOpen(false)}
            />
          ) : (
            <ReaderStudyDock
              page={idx + 1}
              numPages={total}
              concepts={data.concepts}
              study={study}
              onJump={(p) => setIdx(Math.min(Math.max(0, p - 1), Math.max(0, total - 1)))}
              onClose={() => setPanelOpen(false)}
              onOpenHighlight={locateHighlight}
              scope="book"
            />
          ))}
      </div>

      {sel && (
        <HighlightMenu x={sel.x} y={sel.y} onPick={addHighlight} onClose={() => setSel(null)} />
      )}

      <footer className="sticky bottom-0 z-10 grid h-16 grid-cols-3 items-center border-t border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <div />
        <div className="flex items-center justify-center gap-4">
          <NavBtn onClick={() => go(-1)} disabled={idx <= 0}>
            <ChevronLeft className="size-4" /> Anterior
          </NavBtn>
          <span className="min-w-32 truncate text-center text-sm text-[var(--color-ink-soft)]" title={chapterTitle}>
            {total ? `${idx + 1} / ${total}` : "…"}
          </span>
          <NavBtn onClick={() => go(1)} disabled={total > 0 && idx >= total - 1}>
            Próximo <ChevronRight className="size-4" />
          </NavBtn>
        </div>
        <div />
      </footer>

      <style>{`
        .epub-prose{color:var(--color-ink);line-height:1.7;font-family:Georgia,'Times New Roman',serif}
        .epub-prose p{margin:0 0 1em}
        .epub-prose h1,.epub-prose h2,.epub-prose h3,.epub-prose h4{font-weight:600;line-height:1.25;margin:1.6em 0 .6em}
        .epub-prose h1{font-size:1.7em}.epub-prose h2{font-size:1.4em}.epub-prose h3{font-size:1.2em}
        .epub-prose img,.epub-prose svg{max-width:100%;height:auto;margin:1em auto;display:block}
        .epub-prose a{color:var(--color-accent);text-decoration:underline;cursor:pointer}
        .epub-prose a[data-eref]{color:var(--color-accent)}
        .epub-prose blockquote{margin:1em 0;padding-left:1em;border-left:3px solid var(--color-line);color:var(--color-ink-soft)}
        .epub-prose ul,.epub-prose ol{margin:0 0 1em;padding-left:1.5em}
        .epub-prose ul{list-style:disc}
        .epub-prose ol{list-style:decimal}
        .epub-prose li{margin:.25em 0;display:list-item}
        .epub-prose hr{border:none;border-top:1px solid var(--color-line);margin:2em 0}
        .epub-prose table{border-collapse:collapse;margin:1em 0;width:100%}
        .epub-prose td,.epub-prose th{border:1px solid var(--color-line);padding:.4em .6em}
        .epub-prose pre{overflow-x:auto;background:var(--color-surface);padding:1em;border-radius:.5rem}
      `}</style>
    </div>
  );
}

function NavBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
