/**
 * AIProvider — abstração de IA. Implementação: Anthropic (Claude) + Voyage (embeddings).
 * Recursos de IA são opt-in; se não configurado, as features ficam desativadas.
 */
export type AIAction =
  | "explain"
  | "summarize"
  | "translate"
  | "simplify"
  | "flashcards"
  | "quiz"
  | "concepts";

export interface AIProvider {
  /** Disponível só quando há chave configurada (opt-in). */
  readonly enabled: boolean;

  /** Ações inline rápidas sobre um trecho selecionado (modelo leve). */
  act(action: AIAction, text: string, opts?: { targetLang?: string }): Promise<string>;

  /** RAG/raciocínio pesado sobre o conteúdo de um livro (modelo capaz). */
  chatWithBook(bookId: string, question: string): Promise<string>;

  /** Embeddings para mapa de conhecimento e RAG (Voyage). */
  embed(chunks: string[]): Promise<number[][]>;
}
