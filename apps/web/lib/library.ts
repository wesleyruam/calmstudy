import "server-only";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser } from "@calmbook/infra";

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
}

/** Itens da biblioteca do usuário (foco single-user até a auth entrar). */
export async function getLibrary(): Promise<LibraryItem[]> {
  const user = await getOrCreateDefaultUser();
  const items = await prisma.userBook.findMany({
    where: { userId: user.id, deletedAt: null },
    include: { book: true },
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
  }));
}
