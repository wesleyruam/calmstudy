import type { DocumentParser } from "@calmstudy/core";
import { PdfParser } from "./pdf.js";
import { EpubParser } from "./epub.js";

const parsers: DocumentParser[] = [new PdfParser(), new EpubParser()];

/** Resolve o parser capaz de lidar com um formato (ex: "PDF"). */
export function parserFor(format: string): DocumentParser | undefined {
  return parsers.find((p) => p.supports.includes(format));
}

export { PdfParser, EpubParser };
