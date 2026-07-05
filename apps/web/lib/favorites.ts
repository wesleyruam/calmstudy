import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import { serializeHighlight } from "./highlight-shared";
import { serializeNote } from "./note-shared";
import type { StudyHighlight } from "@/components/highlight-item";

export interface FavoriteBook {
  userBookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
}

export interface FavoritesData {
  highlights: StudyHighlight[];
  books: FavoriteBook[];
}

// Favoritos globais (módulo 17): livros e destaques marcados como favoritos.
export async function getFavorites(): Promise<FavoritesData> {
  const user = await currentUser();

  const [highlights, books] = await Promise.all([
    prisma.highlight.findMany({
      where: { favorite: true, userBook: { userId: user.id, deletedAt: null } },
      include: {
        tags: { include: { tag: true } },
        notes: { include: { tags: { include: { tag: true } } }, orderBy: { updatedAt: "desc" } },
        _count: { select: { notes: true } },
        userBook: { include: { book: { select: { title: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.userBook.findMany({
      where: { userId: user.id, favorite: true, deletedAt: null },
      include: { book: true },
      orderBy: { lastReadAt: "desc" },
    }),
  ]);

  return {
    highlights: highlights.map((h) => ({
      ...serializeHighlight(h),
      userBookId: h.userBookId,
      bookTitle: h.userBook.book.title,
      notes: h.notes.map(serializeNote),
    })),
    books: books.map((ub) => ({
      userBookId: ub.id,
      title: ub.book.title,
      author: ub.book.author,
      coverUrl: ub.book.coverUrl,
    })),
  };
}
