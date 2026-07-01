import "server-only";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser } from "@calmbook/infra";

export interface ReaderData {
  userBookId: string;
  title: string;
  author: string | null;
  format: string;
  fileUrl: string;
  pages: number | null;
  lastPage: number;
  zoom: number | null;
  viewMode: string | null;
}

/** Dados para abrir um documento no leitor — só do dono (foco single-user até a auth). */
export async function getReaderData(userBookId: string): Promise<ReaderData | null> {
  const user = await getOrCreateDefaultUser();
  const ub = await prisma.userBook.findFirst({
    where: { id: userBookId, userId: user.id, deletedAt: null },
    include: { book: true },
  });
  if (!ub || ub.book.status !== "READY") return null;

  return {
    userBookId: ub.id,
    title: ub.book.title,
    author: ub.book.author,
    format: ub.book.format,
    fileUrl: `/api/files/${ub.book.fileKey.split("/").map(encodeURIComponent).join("/")}`,
    pages: ub.book.pages,
    lastPage: ub.lastPage,
    zoom: ub.zoom,
    viewMode: ub.viewMode,
  };
}
