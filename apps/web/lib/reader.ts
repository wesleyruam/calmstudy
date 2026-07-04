import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";

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
  // visão geral (coluna esquerda da bancada de leitura)
  totalSeconds: number;
  conceptCount: number;
  concepts: { id: string; title: string; color: string }[];
}

/** Dados para abrir um documento no leitor — só do dono (foco single-user até a auth). */
export async function getReaderData(userBookId: string): Promise<ReaderData | null> {
  const user = await getOrCreateDefaultUser();
  const ub = await prisma.userBook.findFirst({
    where: { id: userBookId, userId: user.id, deletedAt: null },
    include: { book: true },
  });
  if (!ub || ub.book.status !== "READY") return null;

  const [sessionAgg, conceptBooks] = await Promise.all([
    prisma.studySession.aggregate({ where: { userBookId }, _sum: { seconds: true } }),
    prisma.conceptBook.findMany({
      where: { userBookId },
      include: { concept: { select: { id: true, title: true, color: true } } },
      orderBy: { concept: { title: "asc" } },
    }),
  ]);

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
    totalSeconds: sessionAgg._sum.seconds ?? 0,
    conceptCount: conceptBooks.length,
    concepts: conceptBooks.map((cb) => ({
      id: cb.concept.id,
      title: cb.concept.title,
      color: cb.concept.color ?? "#94a3b8",
    })),
  };
}
