import { extractText, getDocumentProxy, getMeta } from "unpdf";
import type { DocumentParser, ParsedDocument, ParsedMetadata } from "@calmstudy/core";

/**
 * Parser de PDF usando unpdf (PDF.js empacotado p/ Node, sem deps nativas).
 * Extrai texto + nº de páginas + metadata. Capa (render da pág. 1) fica como
 * melhoria posterior — exige rasterização. Roda SÓ no worker.
 */
export class PdfParser implements DocumentParser {
  readonly supports = ["PDF"] as const;

  async parse(data: Buffer): Promise<ParsedDocument> {
    const pdf = await getDocumentProxy(new Uint8Array(data));

    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    let metadata: ParsedMetadata = {};
    try {
      const meta = await getMeta(pdf);
      const info = (meta.info ?? {}) as Record<string, unknown>;
      metadata = {
        title: asString(info.Title),
        author: asString(info.Author),
        language: asString(info.Language),
      };
    } catch {
      // PDFs podem não ter dicionário de info — segue sem metadata.
    }

    return {
      text, // mergePages: true → string única
      pages: totalPages ?? null,
      cover: null,
      metadata,
    };
  }
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
