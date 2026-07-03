// @calmstudy/core — domínio puro (sem Next, sem infra concreta).
// Casos de uso conversam com infraestrutura apenas através destas portas.

export type { StorageProvider } from "./ports/storage.js";
export type {
  DocumentParser,
  ParsedDocument,
  ParsedMetadata,
} from "./ports/parser.js";
export type { SearchProvider, SearchHit } from "./ports/search.js";
export type { AIProvider, AIAction } from "./ports/ai.js";

/** Nome das filas BullMQ compartilhadas entre web (produtor) e worker (consumidor). */
export const QUEUES = {
  documentProcessing: "document-processing",
} as const;

/** Payload do job de ingestão de documento. */
export interface ProcessDocumentJob {
  bookId: string;
  fileKey: string;
  format: string;
  /** Só (re)gera a capa, sem reprocessar texto/metadata — usado no backfill. */
  coverOnly?: boolean;
}
