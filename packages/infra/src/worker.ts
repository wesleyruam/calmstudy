// Entrada "pesada" do infra — parsers de documento (unpdf/pdfjs) e capa. SÓ no worker.
export { PdfParser, EpubParser, parserFor } from "./parser/index.js";
export { renderCover } from "./parser/cover.js";
