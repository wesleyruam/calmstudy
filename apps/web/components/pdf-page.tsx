"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PdfDoc, PdfViewport } from "@/components/pdf-types";
import {
  CATEGORY_META,
  HIGHLIGHT_CATEGORIES,
  hexToRgba,
  highlightColor,
  type HighlightCategory,
  type HighlightDTO,
  type HighlightRect,
} from "@/lib/highlight-shared";

// Interface mínima da TextLayer do pdf.js v4.
interface TextLayerInstance {
  render: () => Promise<void>;
  cancel?: () => void;
}
interface PdfjsModule {
  TextLayer: new (o: {
    textContentSource: unknown;
    container: HTMLElement;
    viewport: PdfViewport;
  }) => TextLayerInstance;
}

export interface NewHighlight {
  text: string;
  page: number;
  category: HighlightCategory;
  anchor: { page: number; rects: HighlightRect[] };
}

interface SelectionState {
  left: number;
  top: number;
  text: string;
  rects: HighlightRect[];
}

export function PdfPageView({
  doc,
  page,
  scale,
  dark,
  highlights,
  activeId,
  tool,
  onCreate,
  onOpen,
}: {
  doc: PdfDoc;
  page: number;
  scale: number;
  dark: boolean;
  highlights: HighlightDTO[];
  activeId: string | null;
  // "select" = mostra o popup de cores; uma categoria = caneta ativa (destaca direto).
  tool: "select" | HighlightCategory;
  onCreate: (h: NewHighlight) => void;
  onOpen: (h: HighlightDTO) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const textLayerTaskRef = useRef<TextLayerInstance | null>(null);

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<SelectionState | null>(null);

  // Renderiza canvas + camada de texto sempre que página/escala mudam.
  useEffect(() => {
    if (!doc) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const textLayerEl = textLayerRef.current;
    if (!canvas || !container || !textLayerEl) return;

    let active = true;
    setSel(null);

    (async () => {
      const pdfjs = (await import("pdfjs-dist")) as unknown as PdfjsModule;
      const pdfPage = await doc.getPage(page);
      if (!active) return;

      const viewport = pdfPage.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      setDims({ w: Math.floor(viewport.width), h: Math.floor(viewport.height) });

      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => {});
      if (!active) return;

      // Camada de texto (seleção transparente alinhada ao canvas).
      // O pdf.js dimensiona o container via --scale-factor e marca data-main-rotation
      // (páginas com /Rotate); o CSS aplica a rotação para sobrepor ao canvas.
      textLayerTaskRef.current?.cancel?.();
      textLayerEl.replaceChildren();
      textLayerEl.style.setProperty("--scale-factor", String(scale));
      try {
        const textContent = await pdfPage.getTextContent();
        if (!active) return;
        const tl = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textLayerEl,
          viewport,
        });
        textLayerTaskRef.current = tl;
        await tl.render();
      } catch {
        // páginas só-imagem podem não ter texto — segue sem seleção
      }
    })();

    return () => {
      active = false;
    };
  }, [doc, page, scale]);

  // Calcula a seleção atual na camada de texto (ou null).
  const computeSelection = useCallback((): SelectionState | null => {
    const container = containerRef.current;
    const textLayerEl = textLayerRef.current;
    if (!container || !textLayerEl) return null;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    if (!textLayerEl.contains(range.commonAncestorContainer)) return null;

    const box = container.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return null;
    const rects: HighlightRect[] = Array.from(range.getClientRects())
      .filter((r) => r.width > 1 && r.height > 1)
      .map((r) => ({
        x: (r.left - box.left) / box.width,
        y: (r.top - box.top) / box.height,
        w: r.width / box.width,
        h: r.height / box.height,
      }));
    const text = selection.toString().trim();
    const first = rects[0];
    if (rects.length === 0 || text.length === 0 || !first) return null;
    return { left: first.x * box.width, top: first.y * box.height, text, rects };
  }, []);

  // Ao soltar o mouse: com caneta ativa, destaca direto; senão abre o popup de cores.
  const handleSelection = useCallback(() => {
    const s = computeSelection();
    if (!s) {
      setSel(null);
      return;
    }
    if (tool === "select") {
      setSel(s);
    } else {
      onCreate({ text: s.text, page, category: tool, anchor: { page, rects: s.rects } });
      window.getSelection()?.removeAllRanges();
      setSel(null);
    }
  }, [computeSelection, tool, onCreate, page]);

  const create = (category: HighlightCategory) => {
    if (!sel) return;
    onCreate({
      text: sel.text,
      page,
      category,
      anchor: { page, rects: sel.rects },
    });
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  const pageHighlights = highlights.filter((h) => (h.page ?? h.anchor.page) === page);

  return (
    <div
      ref={containerRef}
      className="relative select-text"
      style={{ width: dims.w || undefined, height: dims.h || undefined }}
      onMouseUp={() => setTimeout(handleSelection, 0)}
    >
      <canvas
        ref={canvasRef}
        className={[
          "block rounded-md",
          dark
            ? "[filter:invert(0.9)_hue-rotate(180deg)]"
            : "shadow-[var(--shadow-calm)] ring-1 ring-[var(--color-line)]",
        ].join(" ")}
      />

      {/* destaques salvos */}
      <div className="highlightLayer">
        {pageHighlights.flatMap((h) =>
          (h.anchor.rects ?? []).map((r, i) => (
            <div
              key={`${h.id}-${i}`}
              className="hl"
              data-active={h.id === activeId}
              title={CATEGORY_META[h.category].label}
              onClick={() => onOpen(h)}
              style={{
                left: r.x * dims.w,
                top: r.y * dims.h,
                width: r.w * dims.w,
                height: r.h * dims.h,
                background: hexToRgba(highlightColor(h), 0.4),
              }}
            />
          )),
        )}
      </div>

      {/* camada de texto (pdf.js escreve os spans aqui) */}
      <div ref={textLayerRef} className="textLayer" />

      {sel && <SelectionToolbar left={sel.left} top={sel.top} onPick={create} />}
    </div>
  );
}

function SelectionToolbar({
  left,
  top,
  onPick,
}: {
  left: number;
  top: number;
  onPick: (c: HighlightCategory) => void;
}) {
  return (
    <div
      className="absolute z-10 -translate-y-full"
      style={{ left, top: top - 8 }}
      onMouseDown={(e) => e.preventDefault()} // não perde a seleção ao clicar
    >
      <div className="flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-calm)]">
        {HIGHLIGHT_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          return (
            <button
              key={c}
              onClick={() => onPick(c)}
              title={meta.label}
              className="grid size-6 place-items-center rounded-full transition-transform hover:scale-110"
              style={{ background: hexToRgba(meta.color, 0.85) }}
              aria-label={meta.label}
            >
              <span className="size-3 rounded-full" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
