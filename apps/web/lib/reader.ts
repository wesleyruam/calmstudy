import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import { getSpacesForBook, countPublicContributions } from "./contributions";

export interface ReaderData {
  userBookId: string;
  bookId: string;
  title: string;
  author: string | null;
  format: string;
  fileUrl: string;
  pages: number | null;
  lastPage: number;
  progress: number; // fração 0–1 (usada p/ restaurar a rolagem no leitor de MOBI)
  zoom: number | null;
  viewMode: string | null;
  // visão geral (coluna esquerda da bancada de leitura)
  totalSeconds: number;
  conceptCount: number;
  concepts: { id: string; title: string; color: string }[];
  // espaços de estudo (deste livro) de que o usuário participa — camada de discussão
  spaces: { id: string; name: string }[];
  communityCount: number; // contribuições públicas deste livro (habilita a camada Comunidade)
}

/** Dados para abrir um documento no leitor — só do dono (foco single-user até a auth). */
export async function getReaderData(userBookId: string): Promise<ReaderData | null> {
  const user = await currentUser();
  const ub = await prisma.userBook.findFirst({
    where: { id: userBookId, userId: user.id, deletedAt: null },
    include: { book: true },
  });
  if (!ub || ub.book.status !== "READY") return null;

  const [sessionAgg, conceptBooks, spaces, communityCount] = await Promise.all([
    prisma.studySession.aggregate({ where: { userBookId }, _sum: { seconds: true } }),
    prisma.conceptBook.findMany({
      where: { userBookId },
      include: { concept: { select: { id: true, title: true, color: true } } },
      orderBy: { concept: { title: "asc" } },
    }),
    getSpacesForBook(user.id, ub.book.id),
    countPublicContributions(ub.book.id),
  ]);

  return {
    userBookId: ub.id,
    bookId: ub.book.id,
    title: ub.book.title,
    author: ub.book.author,
    format: ub.book.format,
    fileUrl: `/api/files/${ub.book.fileKey.split("/").map(encodeURIComponent).join("/")}`,
    pages: ub.book.pages,
    lastPage: ub.lastPage,
    progress: ub.progress,
    zoom: ub.zoom,
    viewMode: ub.viewMode,
    totalSeconds: sessionAgg._sum.seconds ?? 0,
    conceptCount: conceptBooks.length,
    concepts: conceptBooks.map((cb) => ({
      id: cb.concept.id,
      title: cb.concept.title,
      color: cb.concept.color ?? "#94a3b8",
    })),
    spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
    communityCount,
  };
}
