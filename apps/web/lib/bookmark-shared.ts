// Marcadores inteligentes (módulo 12): categorias de marcador com rótulo/emoji.
export const BOOKMARK_CATEGORIES = [
  { key: "REVIEW", label: "Revisar", emoji: "🔁" },
  { key: "IMPORTANT", label: "Muito importante", emoji: "⭐" },
  { key: "APPLY", label: "Aplicar", emoji: "🛠️" },
  { key: "RESEARCH", label: "Pesquisar", emoji: "🔍" },
  { key: "EXERCISE", label: "Exercício", emoji: "✏️" },
  { key: "QUESTION", label: "Dúvida", emoji: "❓" },
  { key: "PROJECT", label: "Projeto", emoji: "📦" },
  { key: "WORK", label: "Trabalho", emoji: "💼" },
  { key: "COLLEGE", label: "Faculdade", emoji: "🎓" },
] as const;

export type BookmarkCategoryKey = (typeof BOOKMARK_CATEGORIES)[number]["key"];

export const BOOKMARK_KEYS = BOOKMARK_CATEGORIES.map((c) => c.key) as [
  BookmarkCategoryKey,
  ...BookmarkCategoryKey[],
];

export function bookmarkMeta(key: string | null) {
  return BOOKMARK_CATEGORIES.find((c) => c.key === key) ?? null;
}

export interface BookmarkDTO {
  id: string;
  page: number;
  category: string | null;
  title: string | null;
  createdAt: string;
}
