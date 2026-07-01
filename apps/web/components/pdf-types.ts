// Tipos mínimos do pdf.js compartilhados entre o leitor de página única e o modo livro.
export interface PdfViewport {
  width: number;
  height: number;
}
export interface PdfPage {
  getViewport: (o: { scale: number }) => PdfViewport;
  render: (o: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void>; cancel: () => void };
}
export interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
}

/** Filtro aplicado no modo escuro para o PDF combinar com o fundo do leitor. */
export const DARK_PDF_FILTER = "invert(0.9) hue-rotate(180deg)";
