import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";
import { getConcepts } from "./concepts";
import { serializeNote, type NoteDTO } from "./note-shared";
import type { ConceptListItem } from "./concept-shared";

export interface FreePage {
  id: string;
  title: string | null;
  updatedAt: string;
}

export interface KnowledgeData {
  concepts: ConceptListItem[];
  freePages: FreePage[];
}

// Carrega uma página livre (nota isFreePage) do usuário.
export async function getFreePage(id: string): Promise<NoteDTO | null> {
  const user = await getOrCreateDefaultUser();
  const note = await prisma.note.findFirst({
    where: { id, userId: user.id, isFreePage: true },
    include: { tags: { include: { tag: true } } },
  });
  return note ? serializeNote(note) : null;
}

// Lista enxuta dos livros do usuário (para relacionar a conceitos etc.).
export async function getBooksBrief(): Promise<{ userBookId: string; title: string }[]> {
  const user = await getOrCreateDefaultUser();
  const ubs = await prisma.userBook.findMany({
    where: { userId: user.id, deletedAt: null },
    include: { book: { select: { title: true } } },
    orderBy: { book: { title: "asc" } },
  });
  return ubs.map((ub) => ({ userBookId: ub.id, title: ub.book.title }));
}

// Base de conhecimento (módulo 22): conceitos + páginas livres (módulo 5).
export async function getKnowledge(): Promise<KnowledgeData> {
  const user = await getOrCreateDefaultUser();
  const [concepts, pages] = await Promise.all([
    getConcepts(),
    prisma.note.findMany({
      where: { userId: user.id, isFreePage: true },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return {
    concepts,
    freePages: pages.map((p) => ({
      id: p.id,
      title: p.title,
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}
