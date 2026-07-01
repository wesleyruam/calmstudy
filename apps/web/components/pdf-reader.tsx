"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ReaderData } from "@/lib/reader";
import type { PdfDoc } from "@/components/pdf-types";
import { BookView, type BookHandle } from "@/components/book-view";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

type Mode = "single" | "book";

export function PdfReader({ data }: { data: ReaderData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const bookRef = useRef<BookHandle>(null);

  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(data.pages ?? 0);
  const [page, setPage] = useState(Math.max(1, data.lastPage || 1));
  const [scale, setScale] = useState(data.zoom ?? 1.2);
  const [mode, setMode] = useState<Mode>(data.viewMode === "book" ? "book" : "single");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

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

  // Modo página única: renderiza a página atual sempre que page/scale muda.
  useEffect(() => {
    if (mode !== "single" || !doc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let active = true;
    (async () => {
      const pdfPage = await doc.getPage(page);
      if (!active) return;
      const dpr = window.devicePixelRatio || 1;
      const viewport = pdfPage.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => {});
    })();

    return () => {
      active = false;
    };
  }, [doc, page, scale, mode]);

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

  const zoom = (d: number) =>
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round((s + d) * 10) / 10)));

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-paper)]">
      {/* barra superior */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-[var(--color-line)] bg-[var(--color-paper)]/80 px-4 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-line)]/60"
        >
          ← Biblioteca
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{data.title}</p>
          {data.author && (
            <p className="truncate text-xs text-[var(--color-ink-soft)]">{data.author}</p>
          )}
        </div>

        <ModeToggle mode={mode} onChange={setMode} />

        <div className="flex items-center gap-1 text-sm text-[var(--color-ink-soft)]">
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
      </header>

      {/* área de leitura */}
      <div className="flex flex-1 justify-center overflow-auto px-4 py-8">
        {error ? (
          <p className="mt-20 text-sm text-[var(--color-ink-soft)]">{error}</p>
        ) : loading || !doc ? (
          <p className="mt-20 animate-pulse text-sm text-[var(--color-ink-soft)]">
            Abrindo documento…
          </p>
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
          <canvas
            ref={canvasRef}
            className={[
              "h-fit rounded-md transition-[filter]",
              dark
                ? "[filter:invert(0.9)_hue-rotate(180deg)]"
                : "shadow-[var(--shadow-calm)] ring-1 ring-[var(--color-line)]",
            ].join(" ")}
          />
        )}
      </div>

      {/* navegação inferior */}
      <footer className="sticky bottom-0 z-10 flex h-16 items-center justify-center gap-6 border-t border-[var(--color-line)] bg-[var(--color-paper)]/80 backdrop-blur-xl">
        <NavBtn onClick={() => go(-1)} disabled={page <= 1}>
          ← Anterior
        </NavBtn>
        <span className="min-w-28 text-center text-sm tabular-nums text-[var(--color-ink-soft)]">
          Página {page} / {numPages || "…"}
        </span>
        <NavBtn onClick={() => go(1)} disabled={!!numPages && page >= numPages}>
          Próxima →
        </NavBtn>
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
      className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2 text-sm transition-colors hover:bg-[var(--color-line)]/40 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
