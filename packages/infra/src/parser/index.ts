import type { DocumentParser } from "@calmbook/core";
import { PdfParser } from "./pdf.js";

const parsers: DocumentParser[] = [new PdfParser()];

/** Resolve o parser capaz de lidar com um formato (ex: "PDF"). */
export function parserFor(format: string): DocumentParser | undefined {
  return parsers.find((p) => p.supports.includes(format));
}

export { PdfParser };
