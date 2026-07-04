// Marcadores inteligentes (módulo 12): categorias de marcador com rótulo/ícone.
// `icon` é o nome de um ícone do lucide-react (mapeado no cliente).
export const BOOKMARK_CATEGORIES = [
  { key: "REVIEW", label: "Revisar", icon: "Repeat" },
  { key: "IMPORTANT", label: "Muito importante", icon: "Star" },
  { key: "APPLY", label: "Aplicar", icon: "Wrench" },
  { key: "RESEARCH", label: "Pesquisar", icon: "Search" },
  { key: "EXERCISE", label: "Exercício", icon: "PencilLine" },
  { key: "QUESTION", label: "Dúvida", icon: "CircleHelp" },
  { key: "PROJECT", label: "Projeto", icon: "Package" },
  { key: "WORK", label: "Trabalho", icon: "Briefcase" },
  { key: "COLLEGE", label: "Faculdade", icon: "GraduationCap" },
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
