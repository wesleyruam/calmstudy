"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReaderData } from "@/lib/reader";
import type { PdfDoc } from "@/components/pdf-types";
import { BookView, type BookHandle } from "@/components/book-view";
import { PdfPageView, type NewHighlight } from "@/components/pdf-page";
import { HighlightPanel } from "@/components/highlight-panel";
import { HighlightNotes } from "@/components/highlight-notes";
import { BookmarksControl } from "@/components/bookmarks-control";
import { StudySessionTracker } from "@/components/study-session-tracker";
import { ReaderRail } from "@/components/reader-rail";
import { ReaderPagePanel, type PanelTab } from "@/components/reader-page-panel";
import { ReaderTools, type ReaderTool } from "@/components/reader-tools";
import { ReaderFind } from "@/components/reader-find";
import { DiscussionPanel } from "@/components/space-discussion-panel";
import { LayerSelector, type ReaderLayer } from "@/components/layer-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoadingMark } from "@/components/logo";
import {
  Notebook,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelRight,
  Search,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Focus,
} from "lucide-react";
import type { HighlightDTO } from "@/lib/highlight-shared";
import type { NoteDTO } from "@/lib/note-shared";
import type { PageLinkDTO } from "@/lib/page-link-shared";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

type Mode = "single" | "book";

export function PdfReader({ data }: { data: ReaderData }) {
  const bookRef = useRef<BookHandle>(null);

  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(data.pages ?? 0);
  const [page, setPage] = useState(Math.max(1, data.lastPage || 1));
  const [scale, setScale] = useState(data.zoom ?? 1.2);
  const [mode, setMode] = useState<Mode>(data.viewMode === "book" ? "book" : "single");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [highlights, setHighlights] = useState<HighlightDTO[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<HighlightDTO | null>(null);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [links, setLinks] = useState<PageLinkDTO[]>([]);
  const [panelTab, setPanelTab] = useState<PanelTab>("content");
  const [panelOpen, setPanelOpen] = useState(true);
  const [tool, setTool] = useState<ReaderTool>("select");
  const [findOpen, setFindOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fitWidth, setFitWidth] = useState(true);
  const [focus, setFocus] = useState(false);
  const [layer, setLayer] = useState<ReaderLayer>("personal");

  const activeSpace =
    layer === "personal" || layer === "community" ? null : data.spaces.find((s) => s.id === layer) ?? null;
  const isCommunity = layer === "community";
  const showLayers = data.spaces.length > 0 || data.communityCount > 0;

  const jumpTo = useCallback(
    (p: number) => setPage(Math.min(Math.max(1, p), numPages || 1)),
    [numPages],
  );

  // Escala efetiva reportada pela página (fit-width) → alimenta o % e persistência.
  const handleScaleChange = useCallback((s: number) => {
    setScale((cur) => (Math.abs(cur - s) > 0.005 ? s : cur));
  }, []);

  // Hidrata/persiste preferências de UI do leitor (aba, painel, ferramenta, fit).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("reader:prefs");
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<{
        panelOpen: boolean;
        panelTab: PanelTab;
        tool: ReaderTool;
        fitWidth: boolean;
      }>;
      if (typeof p.panelOpen === "boolean") setPanelOpen(p.panelOpen);
      if (p.panelTab) setPanelTab(p.panelTab);
      if (p.tool) setTool(p.tool);
      if (typeof p.fitWidth === "boolean") setFitWidth(p.fitWidth);
    } catch {
      // localStorage indisponível — usa os padrões
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("reader:prefs", JSON.stringify({ panelOpen, panelTab, tool, fitWidth }));
    } catch {
      // ignora
    }
  }, [panelOpen, panelTab, tool, fitWidth]);

  // Tela cheia (Fase C): alterna e acompanha o estado real do documento.
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }, []);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // Acompanha o tema (classe .dark no <html>) para inverter o PDF no modo escuro,
  // fazendo a página se fundir com o fundo do leitor.
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Carrega o documento uma vez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const loaded = (await pdfjs.getDocument({ url: data.fileUrl }).promise) as unknown as PdfDoc;
        if (cancelled) return;
        setDoc(loaded);
        setNumPages(loaded.numPages);
        setPage((p) => Math.min(Math.max(1, p), loaded.numPages));
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError("Não foi possível abrir o PDF.");
          setLoading(false);
          console.error(e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.fileUrl]);

  // Carrega os destaques do livro (para renderizar como overlay no leitor).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/userbooks/${data.userBookId}/highlights`)
      .then((r) => (r.ok ? r.json() : { highlights: [] }))
      .then((d) => {
        if (!cancelled) setHighlights(d.highlights ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.userBookId]);

  // Carrega as notas do livro (para o painel de contexto por página).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/notes?userBookId=${data.userBookId}`)
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => {
        if (!cancelled) setNotes(d.notes ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.userBookId]);

  // Carrega os links entre páginas do livro (aba Links do painel).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/userbooks/${data.userBookId}/links`)
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((d) => {
        if (!cancelled) setLinks(d.links ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.userBookId]);

  const createHighlight = useCallback(
    async (h: NewHighlight) => {
      const res = await fetch(`/api/userbooks/${data.userBookId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(h),
      });
      if (!res.ok) return;
      const { highlight } = await res.json();
      setHighlights((prev) => [...prev, highlight]);
      setActiveHighlight(highlight);
      setPanelOpen(true);
    },
    [data.userBookId],
  );

  // Cria nota/pergunta ancorada ao livro + página atual (painel da página).
  const createNote = useCallback(
    async (kind: "NOTE" | "QUESTION", text: string) => {
      const content = {
        type: "doc",
        content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
      };
      const res = await fetch(`/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userBookId: data.userBookId, page, kind, content, contentText: text }),
      });
      if (!res.ok) return;
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
    },
    [data.userBookId, page],
  );

  const deleteNote = useCallback(async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Cria/remove link entre páginas (partindo da página atual).
  const createLink = useCallback(
    async (toPage: number, label: string) => {
      const res = await fetch(`/api/userbooks/${data.userBookId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPage: page, toPage, label }),
      });
      if (!res.ok) return;
      const { link } = await res.json();
      setLinks((prev) => [...prev, link]);
    },
    [data.userBookId, page],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/userbooks/${data.userBookId}/links/${id}`, { method: "DELETE" });
      if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
    },
    [data.userBookId],
  );

  const openTool = useCallback((t: PanelTab) => {
    setActiveHighlight(null);
    setPanelTab(t);
    setPanelOpen(true);
  }, []);

  // Marca a página atual (barra flutuante de ferramentas).
  const bookmarkPage = useCallback(async () => {
    await fetch(`/api/userbooks/${data.userBookId}/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    }).catch(() => {});
  }, [data.userBookId, page]);

  const updateHighlight = useCallback((h: HighlightDTO) => {
    setHighlights((prev) => prev.map((x) => (x.id === h.id ? h : x)));
    setActiveHighlight((cur) => (cur?.id === h.id ? h : cur));
  }, []);

  const deleteHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((x) => x.id !== id));
    setActiveHighlight((cur) => (cur?.id === id ? null : cur));
  }, []);

  // Persiste página/zoom/modo (debounced).
  useEffect(() => {
    if (loading || !numPages) return;
    const t = setTimeout(() => {
      void fetch(`/api/userbooks/${data.userBookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastPage: page,
          zoom: scale,
          progress: numPages ? page / numPages : 0,
          status: "READING",
          viewMode: mode,
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [page, scale, mode, numPages, loading, data.userBookId]);

  const go = useCallback(
    (delta: number) => {
      if (mode === "book") {
        delta > 0 ? bookRef.current?.next() : bookRef.current?.prev();
      } else {
        setPage((p) => Math.min(Math.max(1, p + delta), numPages || 1));
      }
    },
    [mode, numPages],
  );

  // Navegação por teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const zoom = (d: number) => {
    setFitWidth(false);
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + d) * 10) / 10)));
  };

  // Escopo por página + contadores da visão geral.
  const pageHighlights = highlights.filter((h) => (h.page ?? h.anchor?.page) === page);
  const standaloneNotes = notes.filter((n) => !n.highlightId && !n.isFreePage);
  const pageNotes = standaloneNotes.filter((n) => n.page === page);
  const pageLinks = links.filter((l) => l.fromPage === page);
  const counts = {
    highlights: highlights.length,
    notes: standaloneNotes.filter((n) => n.kind === "NOTE").length,
    questions: standaloneNotes.filter((n) => n.kind === "QUESTION").length,
    concepts: data.conceptCount,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-paper)]">
      <StudySessionTracker userBookId={data.userBookId} page={page} />
      {/* barra superior: breadcrumb · navegação central · ferramentas */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Link
            href="/"
            className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            aria-label="Voltar à biblioteca"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <nav className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link href="/" className="shrink-0 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Biblioteca
            </Link>
            <span className="shrink-0 text-[var(--color-ink-soft)]">/</span>
            <span className="truncate font-medium">{data.title}</span>
            {data.author && (
              <span className="hidden truncate text-[var(--color-ink-soft)] sm:inline">· {data.author}</span>
            )}
          </nav>
        </div>

        {/* navegação central de página */}
        {mode === "single" && (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-line)] px-1 py-0.5 text-sm">
            <button
              onClick={() => go(-1)}
              disabled={page <= 1}
              className="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60 disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-1 tabular-nums text-[var(--color-ink-soft)]">
              <span className="font-medium text-[var(--color-ink)]">{page}</span> de {numPages || "…"}
            </span>
            <button
              onClick={() => go(1)}
              disabled={!!numPages && page >= numPages}
              className="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60 disabled:opacity-30"
              aria-label="Próxima página"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-1">
          {showLayers && (
            <div className="mr-1">
              <LayerSelector
                spaces={data.spaces}
                community={data.communityCount > 0}
                value={layer}
                onChange={(l) => {
                  setLayer(l);
                  setActiveHighlight(null);
                  if (l !== "personal") setPanelOpen(true);
                }}
              />
            </div>
          )}
          <button
            onClick={() => setFindOpen((v) => !v)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              findOpen ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
            ].join(" ")}
            title="Buscar no livro"
            aria-label="Buscar no livro"
          >
            <Search className="size-4" />
          </button>

          <Link
            href={`/caderno/${data.userBookId}`}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title="Caderno do livro"
            aria-label="Caderno do livro"
          >
            <Notebook className="size-4" />
          </Link>

          <BookmarksControl
            userBookId={data.userBookId}
            currentPage={page}
            onJump={jumpTo}
          />

          <ModeToggle mode={mode} onChange={setMode} />

          <ThemeToggle />

          <button
            onClick={() => setFocus((v) => !v)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              focus ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
            ].join(" ")}
            title={focus ? "Sair do modo foco" : "Modo foco (leitura limpa)"}
            aria-label={focus ? "Sair do modo foco" : "Modo foco"}
          >
            <Focus className="size-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
            title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
            aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={[
              "grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              panelOpen ? "text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]",
            ].join(" ")}
            title="Painel da página"
            aria-label="Alternar painel da página"
          >
            <PanelRight className="size-4" />
          </button>
        </div>
      </header>

      {/* bancada: ferramentas | página | painel de contexto */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {findOpen && (
          <ReaderFind
            doc={doc}
            numPages={numPages}
            currentPage={page}
            onJump={(p) => {
              jumpTo(p);
              setMode("single");
            }}
            onClose={() => setFindOpen(false)}
          />
        )}
        {!focus && (
          <ReaderRail
            userBookId={data.userBookId}
            page={page}
            numPages={numPages}
            totalSeconds={data.totalSeconds}
            counts={counts}
          />
        )}

        <div className="flex min-h-0 min-w-0 flex-1">
          {mode === "single" && !loading && doc && !error && !focus && (
            <div className="flex w-14 shrink-0 items-center justify-center">
              <ReaderTools
                tool={tool}
                onTool={setTool}
                onNote={() => openTool("notes")}
                onQuestion={() => openTool("questions")}
                onBookmark={bookmarkPage}
              />
            </div>
          )}
          <div className="flex flex-1 justify-center overflow-auto px-4 py-8">
            {error ? (
              <p className="mt-20 text-sm text-[var(--color-ink-soft)]">{error}</p>
            ) : loading || !doc ? (
              <LoadingMark label="Abrindo documento…" className="mt-24" />
            ) : mode === "book" ? (
              <BookView
                ref={bookRef}
                doc={doc}
                numPages={numPages}
                scale={scale}
                dark={dark}
                initialPage={page}
                onPage={setPage}
              />
            ) : (
              <PdfPageView
                doc={doc}
                page={page}
                scale={scale}
                fitWidth={fitWidth}
                dark={dark}
                highlights={highlights}
                activeId={activeHighlight?.id ?? null}
                tool={tool}
                onCreate={createHighlight}
                onOpen={setActiveHighlight}
                onScaleChange={handleScaleChange}
              />
            )}
          </div>
        </div>

        {focus ? null : activeHighlight ? (
          <HighlightPanel
            key={activeHighlight.id}
            highlight={activeHighlight}
            onUpdate={updateHighlight}
            onDelete={deleteHighlight}
            onClose={() => setActiveHighlight(null)}
          >
            <HighlightNotes highlightId={activeHighlight.id} />
          </HighlightPanel>
        ) : activeSpace ? (
          panelOpen && (
            <DiscussionPanel
              mode="space"
              title={activeSpace.name}
              subtitle="Discussão"
              spaceId={activeSpace.id}
              page={page}
              onClose={() => setPanelOpen(false)}
            />
          )
        ) : isCommunity ? (
          panelOpen && (
            <DiscussionPanel
              mode="community"
              title="Comunidade"
              subtitle="Conhecimento público"
              bookId={data.bookId}
              page={page}
              onClose={() => setPanelOpen(false)}
            />
          )
        ) : (
          panelOpen && (
            <ReaderPagePanel
              page={page}
              numPages={numPages}
              highlights={pageHighlights}
              notes={pageNotes}
              concepts={data.concepts}
              links={pageLinks}
              tab={panelTab}
              onTab={setPanelTab}
              onOpenHighlight={setActiveHighlight}
              onCreateNote={createNote}
              onDeleteNote={deleteNote}
              onCreateLink={createLink}
              onDeleteLink={deleteLink}
              onJump={jumpTo}
              onClose={() => setPanelOpen(false)}
            />
          )
        )}
      </div>

      {/* navegação inferior */}
      <footer className="sticky bottom-0 z-10 grid h-16 grid-cols-3 items-center border-t border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <div />
        <div className="flex items-center justify-center gap-6">
          <NavBtn onClick={() => go(-1)} disabled={page <= 1}>
            <ChevronLeft className="size-4" /> Anterior
          </NavBtn>
          <span className="min-w-28 text-center text-sm tabular-nums text-[var(--color-ink-soft)]">
            Página {page} / {numPages || "…"}
          </span>
          <NavBtn onClick={() => go(1)} disabled={!!numPages && page >= numPages}>
            Próxima <ChevronRight className="size-4" />
          </NavBtn>
        </div>
        <div className="flex items-center justify-end gap-1 text-sm text-[var(--color-ink-soft)]">
          <button
            onClick={() => setFitWidth(true)}
            className={[
              "mr-1 grid size-8 place-items-center rounded-full transition-colors hover:bg-[var(--color-line)]/60",
              fitWidth ? "bg-[var(--color-accent-soft)] text-[var(--color-ink)]" : "",
            ].join(" ")}
            title="Ajustar à largura"
            aria-label="Ajustar à largura"
          >
            <MoveHorizontal className="size-4" />
          </button>
          <button
            onClick={() => zoom(-0.2)}
            className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <span className="w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => zoom(0.2)}
            className="grid size-8 place-items-center rounded-full hover:bg-[var(--color-line)]/60"
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>
      </footer>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex rounded-full border border-[var(--color-line)] p-0.5 text-xs">
      {(["single", "book"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={[
            "rounded-full px-3 py-1 transition-colors",
            mode === m
              ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-ink)]"
              : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
          ].join(" ")}
        >
          {m === "single" ? "Página" : "Livro"}
        </button>
      ))}
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
