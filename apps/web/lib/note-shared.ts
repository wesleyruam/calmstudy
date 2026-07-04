// Compartilhado servidor/cliente: formato serializado de uma nota Rich Text.

// Documento TipTap (JSON do ProseMirror). Estrutura livre — tipamos como unknown.
export type TiptapDoc = { type: "doc"; content?: unknown[] } | Record<string, unknown>;

export type NoteKind = "NOTE" | "QUESTION";

export interface NoteDTO {
  id: string;
  highlightId: string | null;
  userBookId: string | null;
  page: number | null;
  kind: NoteKind;
  title: string | null;
  content: TiptapDoc;
  contentText: string | null;
  isFreePage: boolean;
  favorite: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NoteRow {
  id: string;
  highlightId: string | null;
  userBookId: string | null;
  page: number | null;
  kind?: string;
  title: string | null;
  content: unknown;
  contentText: string | null;
  isFreePage: boolean;
  favorite: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  tags?: { tag: { name: string } }[];
}

export function serializeNote(n: NoteRow): NoteDTO {
  return {
    id: n.id,
    highlightId: n.highlightId,
    userBookId: n.userBookId,
    page: n.page,
    kind: (n.kind as NoteKind) ?? "NOTE",
    title: n.title,
    content: (n.content ?? { type: "doc" }) as TiptapDoc,
    contentText: n.contentText,
    isFreePage: n.isFreePage,
    favorite: n.favorite,
    tags: (n.tags ?? []).map((t) => t.tag.name),
    createdAt: new Date(n.createdAt).toISOString(),
    updatedAt: new Date(n.updatedAt).toISOString(),
  };
}

/** Doc TipTap vazio — usado ao criar uma nota. */
export const EMPTY_DOC: TiptapDoc = { type: "doc", content: [] };
