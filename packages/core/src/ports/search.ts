/**
 * SearchProvider — busca global.
 * Implementações: PostgresSearch (FTS+pg_trgm, fase 1) → MeilisearchSearch (fase 2).
 */
export interface SearchHit {
  type: "book" | "note" | "highlight";
  id: string;
  title: string;
  snippet?: string;
  score: number;
}

export interface SearchProvider {
  index(doc: { id: string; type: SearchHit["type"]; text: string; userId: string }): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: string, userId: string, limit?: number): Promise<SearchHit[]>;
}
