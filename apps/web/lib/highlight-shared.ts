// Compartilhado entre servidor (API) e cliente (leitor/caderno).
// Sem "server-only": define as categorias de estudo, suas cores/rótulos
// e o formato serializado de um highlight.

export const HIGHLIGHT_CATEGORIES = [
  "IMPORTANT",
  "DEFINITION",
  "EXAMPLE",
  "QUESTION",
  "REVIEW",
  "EXERCISE",
  "QUOTE",
  "IDEA",
  "APPLICATION",
] as const;

export type HighlightCategory = (typeof HIGHLIGHT_CATEGORIES)[number];

export interface CategoryMeta {
  label: string;
  emoji: string;
  /** cor base (hex) usada como padrão do destaque */
  color: string;
}

// Rótulos/cores conforme o módulo 1 do CalmStudy.
export const CATEGORY_META: Record<HighlightCategory, CategoryMeta> = {
  IMPORTANT: { label: "Importante", emoji: "🟨", color: "#f5c542" },
  DEFINITION: { label: "Definição", emoji: "🟩", color: "#4caf72" },
  EXAMPLE: { label: "Exemplo", emoji: "🟦", color: "#4a90d9" },
  QUESTION: { label: "Dúvida", emoji: "🟥", color: "#e05656" },
  REVIEW: { label: "Revisar", emoji: "🟪", color: "#9b6dd6" },
  EXERCISE: { label: "Exercício", emoji: "🟧", color: "#e8934a" },
  QUOTE: { label: "Citação", emoji: "⚪", color: "#9aa0a6" },
  IDEA: { label: "Ideia", emoji: "🔵", color: "#3ab6c8" },
  APPLICATION: { label: "Aplicação prática", emoji: "🟫", color: "#a9744f" },
};

export type ReviewStatus = "NONE" | "PENDING" | "REVIEWED" | "MASTERED";
export type Priority = "LOW" | "MED" | "HIGH";

export interface HighlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HighlightAnchor {
  page: number;
  rects?: HighlightRect[];
  [k: string]: unknown;
}

export interface HighlightDTO {
  id: string;
  page: number | null;
  chapter: string | null;
  category: HighlightCategory;
  color: string | null;
  text: string;
  observation: string | null;
  anchor: HighlightAnchor;
  priority: Priority | null;
  favorite: boolean;
  reviewStatus: ReviewStatus;
  tags: string[];
  noteCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Cor efetiva de um destaque: override personalizado ou a cor da categoria. */
export function highlightColor(h: {
  color: string | null;
  category: HighlightCategory;
}): string {
  return h.color ?? CATEGORY_META[h.category].color;
}

/** Converte #rrggbb + alpha em rgba() (para a camada de destaques translúcida). */
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Formato mínimo que o serializador precisa (evita depender de tipos do Prisma no bundle).
interface HighlightRow {
  id: string;
  page: number | null;
  chapter: string | null;
  category: string;
  color: string | null;
  text: string;
  observation: string | null;
  anchor: unknown;
  priority: string | null;
  favorite: boolean;
  reviewStatus: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  tags?: { tag: { name: string } }[];
  _count?: { notes: number };
}

export function serializeHighlight(h: HighlightRow): HighlightDTO {
  return {
    id: h.id,
    page: h.page,
    chapter: h.chapter,
    category: h.category as HighlightCategory,
    color: h.color,
    text: h.text,
    observation: h.observation,
    anchor: (h.anchor ?? { page: h.page ?? 1 }) as HighlightAnchor,
    priority: h.priority as Priority | null,
    favorite: h.favorite,
    reviewStatus: h.reviewStatus as ReviewStatus,
    tags: (h.tags ?? []).map((t) => t.tag.name),
    noteCount: h._count?.notes ?? 0,
    createdAt: new Date(h.createdAt).toISOString(),
    updatedAt: new Date(h.updatedAt).toISOString(),
  };
}
