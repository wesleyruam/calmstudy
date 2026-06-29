/**
 * DocumentParser — extrai conteúdo e metadata de um documento.
 * Implementações por formato (PDF.js/unpdf, EPUB, Tika...) e roda SÓ no worker.
 */
export interface ParsedDocument {
  text: string;
  pages: number | null;
  cover: Buffer | null;
  metadata: ParsedMetadata;
}

export interface ParsedMetadata {
  title?: string;
  author?: string;
  isbn?: string;
  language?: string;
  year?: number;
  publisher?: string;
  description?: string;
  categories?: string[];
}

export interface DocumentParser {
  /** Formatos que este parser aceita. */
  readonly supports: readonly string[];
  parse(data: Buffer): Promise<ParsedDocument>;
}
