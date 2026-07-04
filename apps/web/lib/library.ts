import "server-only";
import { prisma } from "@calmstudy/db";
import type { Prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";

export interface LibraryItem {
  userBookId: string;
  bookId: string;
  title: string;
  author: string | null;
  format: string;
  pages: number | null;
  status: string;
  progress: number;
  favorite: boolean;
  rating: number | null;
  shelfIds: string[];
  coverUrl: string | null;
}

export type LibraryFilter =
  | "all"
  | "reading"
  | "finished"
  | "favorites"
  | "recent"
  // biblioteca inteligente (módulo 21)
  | "questions"
  | "unannotated"
  | "review";

export const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: "Biblioteca",
  reading: "Em Leitura",
  finished: "Concluídos",
  favorites: "Favoritos",
  recent: "Importados Recentemente",
  questions: "Com dúvidas",
  unannotated: "Sem anotações",
  review: "Revisão pendente",
};

function whereFor(userId: string, filter: LibraryFilter, shelfId?: string): Prisma.UserBookWhereInput {
  const base: Prisma.UserBookWhereInput = { userId, deletedAt: null };
  if (shelfId) base.shelves = { some: { shelfId } };
  switch (filter) {
    case "reading":
      base.status = "READING";
      break;
    case "finished":
      base.status = "FINISHED";
      break;
    case "favorites":
      base.favorite = true;
      break;
    case "recent": {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      base.createdAt = { gte: since };
      break;
    }
    // livros que têm ao menos um destaque marcado como dúvida
    case "questions":
      base.highlights = { some: { category: "QUESTION" } };
      break;
    // livros sem nenhum destaque nem nota — pedindo estudo
    case "unannotated":
      base.highlights = { none: {} };
      base.notes = { none: {} };
      break;
    // livros com destaques aguardando revisão
    case "review":
      base.highlights = { some: { reviewStatus: "PENDING" } };
      break;
    case "all":
      break;
  }
  return base;
}

/** Itens da biblioteca do usuário, com filtro/prateleira (foco single-user até a auth). */
export async function getLibrary(
  filter: LibraryFilter = "all",
  shelfId?: string,
): Promise<LibraryItem[]> {
  const user = await getOrCreateDefaultUser();
  const items = await prisma.userBook.findMany({
    where: whereFor(user.id, filter, shelfId),
    include: { book: true, shelves: { select: { shelfId: true } } },
    orderBy: { createdAt: "desc" },
  });

  return items.map((ub) => ({
    userBookId: ub.id,
    bookId: ub.bookId,
    title: ub.book.title,
    author: ub.book.author,
    format: ub.book.format,
    pages: ub.book.pages,
    status: ub.book.status,
    progress: ub.progress,
    favorite: ub.favorite,
    rating: ub.rating,
    shelfIds: ub.shelves.map((s) => s.shelfId),
    coverUrl: ub.book.coverUrl,
  }));
}
