"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { DARK_PDF_FILTER, type PdfDoc } from "@/components/pdf-types";

export interface BookHandle {
  next: () => void;
  prev: () => void;
}

// Interface mínima do StPageFlip que usamos (evita atrito com os enums internos da lib).
interface FlipInstance {
  loadFromHTML: (els: NodeListOf<Element>) => void;
  getCurrentPageIndex: () => number;
  flipNext: () => void;
  flipPrev: () => void;
  on: (event: string, cb: (e: { data: number }) => void) => void;
  destroy: () => void;
}

interface BookViewProps {
  doc: PdfDoc;
  numPages: number;
  scale: number;
  dark: boolean;
  initialPage: number;
  onPage: (page: number) => void;
}

/**
 * Modo Livro — spread de duas páginas com animação de virar (StPageFlip).
 * As páginas são construídas imperativamente (StPageFlip manipula o DOM, então
 * não deixamos o React dono desses nós) e o PDF é renderizado sob demanda
 * (janela ao redor da página atual) para aguentar livros grandes.
 */
export const BookView = forwardRef<BookHandle, BookViewProps>(function BookView(
  { doc, numPages, scale, dark, initialPage, onPage },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<FlipInstance | null>(null);
  const canvasesRef = useRef<HTMLCanvasElement[]>([]);
  const onPageRef = useRef(onPage);
  const darkRef = useRef(dark);
  const initialPageRef = useRef(initialPage);
  onPageRef.current = onPage;

  useImperativeHandle(ref, () => ({
    next: () => flipRef.current?.flipNext(),
    prev: () => flipRef.current?.flipPrev(),
  }));

  // Init do livro. Re-monta quando o documento ou a escala mudam.
  useEffect(() => {
    const container = mountRef.current;
    if (!container || !doc) return;

    let destroyed = false;
    let flip: { destroy: () => void } | null = null;
    const rendered = new Set<number>();

    const renderPage = async (canvas: HTMLCanvasElement, index: number) => {
      const page = await doc.getPage(index + 1);
      if (destroyed) return;
      const dpr = window.devicePixelRatio || 1;
      const vp = page.getViewport({ scale });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport: vp }).promise.catch(() => {});
    };

    (async () => {
      const mod = await import("page-flip");
      const PageFlip = mod.PageFlip as unknown as new (
        el: HTMLElement,
        settings: Record<string, unknown>,
      ) => FlipInstance;
      if (destroyed) return;

      const first = await doc.getPage(1);
      const vp = first.getViewport({ scale });
      const W = Math.floor(vp.width);
      const H = Math.floor(vp.height);

      container.innerHTML = "";
      const canvases: HTMLCanvasElement[] = [];
      for (let i = 0; i < numPages; i++) {
        const pageDiv = document.createElement("div");
        pageDiv.className = "page";
        pageDiv.style.background = darkRef.current ? "#1a1a1a" : "#ffffff";
        const c = document.createElement("canvas");
        c.style.display = "block";
        c.style.width = "100%";
        c.style.height = "100%";
        c.style.filter = darkRef.current ? DARK_PDF_FILTER : "";
        pageDiv.appendChild(c);
        container.appendChild(pageDiv);
        canvases.push(c);
      }
      canvasesRef.current = canvases;

      const start = Math.min(Math.max(0, initialPageRef.current - 1), numPages - 1);
      const pageFlip = new PageFlip(container, {
        width: W,
        height: H,
        size: "fixed",
        showCover: true,
        usePortrait: false,
        maxShadowOpacity: 0.5,
        drawShadow: true,
        flippingTime: 700,
        startPage: start,
      });
      pageFlip.loadFromHTML(container.querySelectorAll(".page"));
      flipRef.current = pageFlip;
      flip = pageFlip;

      // Pré-renderiza uma janela AMPLA à frente para que o próximo spread (as duas
      // páginas, principalmente a da direita) já esteja pronto ANTES da virada —
      // o evento "flip" dispara só no fim da animação, então não dá pra depender dele.
      const AHEAD = 5; // cobre o spread atual + o próximo inteiro + folga
      const BEHIND = 3;
      const renderWindow = async (center: number) => {
        // ordem: spread atual e à frente primeiro (o que aparece ao virar), depois trás
        const order: number[] = [];
        for (let i = 0; i <= AHEAD; i++) order.push(center + i);
        for (let i = 1; i <= BEHIND; i++) order.push(center - i);
        for (const i of order) {
          if (i < 0 || i >= numPages || rendered.has(i)) continue;
          rendered.add(i);
          await renderPage(canvases[i]!, i);
        }
      };

      await renderWindow(pageFlip.getCurrentPageIndex());
      pageFlip.on("flip", (e) => {
        onPageRef.current(e.data + 1);
        void renderWindow(e.data);
      });
    })();

    return () => {
      destroyed = true;
      try {
        flip?.destroy();
      } catch {
        // ignora
      }
      container.innerHTML = "";
      canvasesRef.current = [];
    };
  }, [doc, scale, numPages]);

  // Atualiza filtro/fundo ao trocar o tema, sem re-montar o livro.
  useEffect(() => {
    darkRef.current = dark;
    for (const c of canvasesRef.current) c.style.filter = dark ? DARK_PDF_FILTER : "";
    const pages = mountRef.current?.querySelectorAll<HTMLElement>(".page");
    pages?.forEach((p) => (p.style.background = dark ? "#1a1a1a" : "#ffffff"));
  }, [dark]);

  return (
    <div className="grid place-items-center py-2">
      <div ref={mountRef} className="[&_.page]:overflow-hidden [&_.page]:rounded-sm" />
    </div>
  );
});
