import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import { serializeHighlight, type HighlightDTO } from "./highlight-shared";
import { serializeNote, type NoteDTO } from "./note-shared";

export interface ReviewHighlight extends HighlightDTO {
  userBookId: string;
  bookTitle: string;
  notes: NoteDTO[];
}

export interface ReviewData {
  highlights: ReviewHighlight[];
  books: { userBookId: string; title: string }[];
  tags: string[];
}

// Modo Revisão (módulo 13): tudo que o usuário produziu, sobre TODOS os livros,
// para revisar sem abrir nenhum PDF.
export async function getReviewData(): Promise<ReviewData> {
  const user = await currentUser();
  const highlights = await prisma.highlight.findMany({
    where: { userBook: { userId: user.id, deletedAt: null } },
    include: {
      tags: { include: { tag: true } },
      notes: {
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { notes: true } },
      userBook: { include: { book: { select: { title: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const booksMap = new Map<string, string>();
  const tagSet = new Set<string>();
  const list: ReviewHighlight[] = highlights.map((h) => {
    booksMap.set(h.userBookId, h.userBook.book.title);
    h.tags.forEach((t) => tagSet.add(t.tag.name));
    return {
      ...serializeHighlight(h),
      userBookId: h.userBookId,
      bookTitle: h.userBook.book.title,
      notes: h.notes.map(serializeNote),
    };
  });

  return {
    highlights: list,
    books: [...booksMap.entries()].map(([userBookId, title]) => ({ userBookId, title })),
    tags: [...tagSet].sort(),
  };
}
