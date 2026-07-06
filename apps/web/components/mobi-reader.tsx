"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlignJustify,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingMark } from "@/components/logo";
import type { ReaderData } from "@/lib/reader";

// ───────────────────────── Parser MOBI (Mobi6 / PalmDOC) ─────────────────────────
// MOBI é um container PDB. Aqui tratamos o caso comum (Mobi6, compressão PalmDOC):
// descomprime os registros de texto → um único HTML, resolve <img recindex> para
// blobs e devolve o corpo já saneado. KF8/AZW3 e HUFF/CDIC caem no fallback.

const POP = (n: number) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };

// PalmDOC (LZ77): descomprime um registro.
function palmDoc(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const c = data[i++]!;
    if (c === 0) out.push(0);
    else if (c <= 8) for (let j = 0; j < c && i < data.length; j++) out.push(data[i++]!);
    else if (c <= 0x7f) out.push(c);
    else if (c <= 0xbf) {
      const n = (c << 8) | data[i++]!;
      const dist = (n >> 3) & 0x7ff;
      let len = (n & 7) + 3;
      let sp = out.length - dist;
      while (len-- > 0 && sp >= 0) out.push(out[sp++]!);
    } else {
      out.push(32, c ^ 0x80);
    }
  }
  return Uint8Array.from(out);
}

// Tamanho de uma "trailing data entry" (varint lido de trás pra frente).
function backSize(rec: Uint8Array): number {
  let num = 0;
  for (const v of rec.subarray(Math.max(0, rec.length - 4))) {
    if (v & 0x80) num = 0;
    num = (num << 7) | (v & 0x7f);
  }
  return num;
}

// Remove os bytes extras no fim de cada registro (flags de extra data).
function trimTrailing(rec: Uint8Array, numTrailing: number, multibyte: boolean): Uint8Array {
  let end = rec.length;
  for (let n = 0; n < numTrailing; n++) end -= backSize(rec.subarray(0, end));
  if (multibyte && end > 0) end -= (rec[end - 1]! & 0x3) + 1;
  return rec.subarray(0, Math.max(0, end));
}

type Parsed = { html: string; blobs: string[] };

function parseMobi(buf: ArrayBuffer): Parsed {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(buf);
  if (bytes.length < 80) throw new Error("Arquivo MOBI inválido.");

  const numRecs = dv.getUint16(76);
  const recOff = (i: number) => (i < numRecs ? dv.getUint32(78 + i * 8) : bytes.length);
  const rec0 = recOff(0);

  const compression = dv.getUint16(rec0 + 0);
  const encoding = dv.getUint32(rec0 + 28);
  const headerLen = dv.getUint32(rec0 + 20);
  const textRecordCount = dv.getUint16(rec0 + 8);
  const firstImage = dv.getUint32(rec0 + 108);
  const extraFlags = headerLen >= 0xe4 ? dv.getUint16(rec0 + 0xf2) : 0;

  if (compression === 17480) throw new Error("MOBI com compressão HUFF/CDIC (não suportado).");
  const magic = String.fromCharCode(bytes[rec0 + 16]!, bytes[rec0 + 17]!, bytes[rec0 + 18]!, bytes[rec0 + 19]!);
  if (magic !== "MOBI") throw new Error("Cabeçalho MOBI não encontrado.");

  const numTrailing = POP(extraFlags >> 1);
  const multibyte = (extraFlags & 1) === 1;

  // Descomprime e concatena os registros de texto.
  const parts: Uint8Array[] = [];
  for (let i = 1; i <= textRecordCount && i < numRecs; i++) {
    const raw = bytes.subarray(recOff(i), recOff(i + 1));
    const trimmed = trimTrailing(raw, numTrailing, multibyte);
    parts.push(compression === 2 ? palmDoc(trimmed) : trimmed);
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { all.set(p, off); off += p.length; }

  const decoder = new TextDecoder(encoding === 1252 ? "windows-1252" : "utf-8");
  let raw = decoder.decode(all);

  // MOBI-isms → HTML padrão
  raw = raw
    .replace(/<mbp:pagebreak[^>]*>/gi, "<hr/>")
    .replace(/<\/?mbp:[^>]*>/gi, "")
    .replace(/<\/?(guide|reference)[^>]*>/gi, "");

  const doc = new DOMParser().parseFromString(raw, "text/html");
  const blobs: string[] = [];
  const blobCache = new Map<number, string>();

  const imageBlob = (recindex: number): string | null => {
    if (blobCache.has(recindex)) return blobCache.get(recindex)!;
    const rec = firstImage + recindex - 1; // recindex é 1-based
    if (rec <= 0 || rec >= numRecs) return null;
    const data = bytes.subarray(recOff(rec), recOff(rec + 1));
    const sig = data[0]! * 256 + data[1]!;
    const type = sig === 0xffd8 ? "image/jpeg" : sig === 0x8950 ? "image/png" : sig === 0x4749 ? "image/gif" : "application/octet-stream";
    const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type }));
    blobCache.set(recindex, url);
    blobs.push(url);
    return url;
  };

  doc.querySelectorAll("img").forEach((img) => {
    const ri = img.getAttribute("recindex") ?? img.getAttribute("hirecindex") ?? img.getAttribute("lorecindex");
    const url = ri ? imageBlob(parseInt(ri, 10)) : null;
    if (url) img.setAttribute("src", url);
    else img.remove();
  });

  // links internos (filepos) — sem alvo mapeável no MVP, viram texto simples
  doc.querySelectorAll("a[filepos]").forEach((a) => a.removeAttribute("href"));
  doc.querySelectorAll("a[href^='http']").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  const REMOVE = new Set(["script", "style", "link", "meta", "title", "iframe", "object", "embed", "head"]);
  doc.querySelectorAll("*").forEach((el) => {
    if (REMOVE.has(el.tagName.toLowerCase())) return el.remove();
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on") || n === "style" || n === "class" || n === "bgcolor" || n === "align" || n === "width" || n === "height")
        el.removeAttribute(attr.name);
    }
  });

  return { html: doc.body?.innerHTML ?? "", blobs };
}

// ─────────────────────────────── Componente ───────────────────────────────

export function MobiReader({ data }: { data: ReaderData }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  // modo de leitura: paginado (estilo livro) ou rolagem contínua.
  const [paged, setPaged] = useState(true);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const scrollRef = useRef<HTMLDivElement>(null); // container (stage no modo página)
  const articleRef = useRef<HTMLElement>(null);
  const blobsRef = useRef<string[]>([]);
  const restoredRef = useRef(false);

  // geometria da página (colunas do tamanho da tela, centradas com margem)
  const readW = Math.min(680, Math.max(280, dims.w - 48));
  const gap = Math.max(0, dims.w - readW);
  const step = readW + gap; // = largura da tela

  // preferências
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mobi:prefs");
      if (raw) {
        const p = JSON.parse(raw) as { fontScale?: number; paged?: boolean };
        if (typeof p.fontScale === "number") setFontScale(Math.min(1.6, Math.max(0.8, p.fontScale)));
        if (typeof p.paged === "boolean") setPaged(p.paged);
      }
    } catch { /* ignora */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("mobi:prefs", JSON.stringify({ fontScale, paged })); } catch { /* ignora */ }
  }, [fontScale, paged]);

  // carrega + parseia
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(data.fileUrl);
        if (!res.ok) throw new Error("Falha ao baixar o arquivo.");
        const parsed = parseMobi(await res.arrayBuffer());
        if (cancelled) return;
        for (const url of blobsRef.current) URL.revokeObjectURL(url);
        blobsRef.current = parsed.blobs;
        setHtml(parsed.html);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Não foi possível abrir o MOBI.");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data.fileUrl]);

  useEffect(() => () => { for (const url of blobsRef.current) URL.revokeObjectURL(url); }, []);

  // mede o palco (recalcula páginas ao redimensionar / modo foco / painel)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [loading]);

  // recalcula o total de páginas quando o conteúdo/geometria/fonte mudam
  useEffect(() => {
    if (!paged || loading || !articleRef.current || step < 1) return;
    const sw = articleRef.current.scrollWidth;
    const count = Math.max(1, Math.round((sw + gap) / step));
    setPageCount(count);
    if (!restoredRef.current) {
      restoredRef.current = true;
      if (data.progress > 0) setPage(Math.round(data.progress * (count - 1)));
    } else {
      setPage((p) => Math.min(p, count - 1));
    }
  }, [paged, loading, html, dims.w, dims.h, fontScale, step, gap, data.progress]);

  // restaura a rolagem ao voltar pro modo contínuo
  useEffect(() => {
    if (paged || loading) return;
    const el = scrollRef.current;
    if (el && data.progress > 0) el.scrollTop = data.progress * (el.scrollHeight - el.clientHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paged, loading]);

  // salva progresso — por página (paginado) ou por rolagem (contínuo), debounced
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveProgress = useCallback((frac: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch(`/api/userbooks/${data.userBookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: Math.min(1, Math.max(0, frac)), status: "READING" }),
      }).catch(() => {});
    }, 900);
  }, [data.userBookId]);

  useEffect(() => {
    if (paged && pageCount > 1) saveProgress(page / (pageCount - 1));
  }, [page, pageCount, paged, saveProgress]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || paged) return;
    const frac = el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    saveProgress(frac);
  }, [paged, saveProgress]);

  const turn = useCallback((d: number) => setPage((p) => Math.min(pageCount - 1, Math.max(0, p + d))), [pageCount]);

  // teclado: ← → viram página no modo paginado
  useEffect(() => {
    if (!paged) return;
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") turn(1);
      else if (e.key === "ArrowLeft") turn(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paged, turn]);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const articleStyle: React.CSSProperties = paged
    ? {
        position: "absolute",
        top: 0,
        left: gap / 2,
        width: readW,
        height: dims.h || "100%",
        columnWidth: readW,
        columnGap: gap,
        columnFill: "auto",
        transform: `translateX(${-page * step}px)`,
        transition: "transform .3s ease",
        fontSize: `${fontScale}rem`,
      }
    : { fontSize: `${fontScale}rem` };

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-paper)]">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <Link href="/" className="shrink-0 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">Biblioteca</Link>
          <span className="shrink-0 text-[var(--color-ink-soft)]">/</span>
          <span className="truncate font-medium">{data.title}</span>
        </nav>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setPaged((v) => !v)} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60" title={paged ? "Modo rolagem" : "Modo página"} aria-label={paged ? "Modo rolagem" : "Modo página"}>
            {paged ? <AlignJustify className="size-4" /> : <BookOpen className="size-4" />}
          </button>
          <button onClick={() => setFontScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60" title="Diminuir texto" aria-label="Diminuir texto"><Minus className="size-4" /></button>
          <button onClick={() => setFontScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60" title="Aumentar texto" aria-label="Aumentar texto"><Plus className="size-4" /></button>
          <ThemeToggle />
          <button onClick={toggleFullscreen} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60" title={fullscreen ? "Sair da tela cheia" : "Tela cheia"} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>{fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={paged ? "relative flex-1 overflow-hidden" : "flex-1 overflow-y-auto"}
      >
        {loading ? (
          <LoadingMark label="Abrindo documento…" className="mt-24" />
        ) : error ? (
          <div className="mx-auto mt-24 max-w-md px-6 text-center">
            <p className="font-serif text-lg">Não foi possível abrir este MOBI</p>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{error}</p>
          </div>
        ) : (
          <article
            ref={articleRef}
            className={paged ? "book-prose book-paged" : "book-prose mx-auto max-w-2xl px-6 py-10"}
            style={articleStyle}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {paged && !loading && !error && (
        <footer className="flex h-12 shrink-0 items-center justify-center gap-6 border-t border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 text-sm backdrop-blur-xl">
          <button onClick={() => turn(-1)} disabled={page <= 0} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60 disabled:opacity-30" aria-label="Página anterior"><ChevronLeft className="size-4" /></button>
          <span className="min-w-20 text-center tabular-nums text-[var(--color-ink-soft)]">{page + 1} / {pageCount}</span>
          <button onClick={() => turn(1)} disabled={page >= pageCount - 1} className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60 disabled:opacity-30" aria-label="Próxima página"><ChevronRight className="size-4" /></button>
        </footer>
      )}

      <style>{`
        .book-prose{color:var(--color-ink);line-height:1.7;font-family:Georgia,'Times New Roman',serif}
        .book-prose p{margin:0 0 1em}
        .book-prose h1,.book-prose h2,.book-prose h3,.book-prose h4{font-weight:600;line-height:1.25;margin:1.6em 0 .6em}
        .book-prose h1{font-size:1.7em}.book-prose h2{font-size:1.4em}.book-prose h3{font-size:1.2em}
        .book-prose img{max-width:100%;height:auto;margin:1em auto;display:block}
        .book-prose a{color:var(--color-accent);text-decoration:underline}
        .book-prose blockquote{margin:1em 0;padding-left:1em;border-left:3px solid var(--color-line);color:var(--color-ink-soft)}
        .book-prose ul{margin:0 0 1em;padding-left:1.5em;list-style:disc}
        .book-prose ol{margin:0 0 1em;padding-left:1.5em;list-style:decimal}
        .book-prose li{margin:.25em 0;display:list-item}
        .book-prose hr{border:none;border-top:1px solid var(--color-line);margin:2em 0}
        /* modo página: imagens não podem estourar a altura da coluna */
        .book-paged img{max-height:100%;object-fit:contain}
        .book-paged h1,.book-paged h2,.book-paged h3{break-inside:avoid}
      `}</style>
    </div>
  );
}
