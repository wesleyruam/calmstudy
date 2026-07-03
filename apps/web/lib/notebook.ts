import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";
import { serializeHighlight, type HighlightDTO } from "./highlight-shared";
import { serializeNote, type NoteDTO } from "./note-shared";
import { serializeSummary, type SummaryDTO } from "./summary-shared";

export interface NotebookHighlight extends HighlightDTO {
  notes: NoteDTO[];
}

export interface NotebookData {
  userBookId: string;
  title: string;
  author: string | null;
  format: string;
  pages: number | null;
  highlights: NotebookHighlight[];
  looseNotes: NoteDTO[];
  summaries: SummaryDTO[];
  counts: {
    highlights: number;
    notes: number;
    tags: number;
    reviewPending: number;
  };
}

// Caderno do livro (módulo 4): agrega tudo que o usuário produziu lendo,
// para revisar sem reabrir o PDF.
export async function getNotebook(userBookId: string): Promise<NotebookData | null> {
  const user = await getOrCreateDefaultUser();
  const ub = await prisma.userBook.findFirst({
    where: { id: userBookId, userId: user.id, deletedAt: null },
    include: { book: true },
  });
  if (!ub) return null;

  const highlights = await prisma.highlight.findMany({
    where: { userBookId },
    include: {
      tags: { include: { tag: true } },
      notes: {
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
      },
      _count: { select: { notes: true } },
    },
    orderBy: [{ page: "asc" }, { createdAt: "asc" }],
  });

  const looseNotes = await prisma.note.findMany({
    where: { userBookId, highlightId: null, userId: user.id },
    include: { tags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const summaries = await prisma.summary.findMany({
    where: { userBookId },
    orderBy: { createdAt: "asc" },
  });

  const tagSet = new Set<string>();
  let notesTotal = looseNotes.length;
  const nbHighlights: NotebookHighlight[] = highlights.map((h) => {
    h.tags.forEach((t) => tagSet.add(t.tag.name));
    notesTotal += h.notes.length;
    return { ...serializeHighlight(h), notes: h.notes.map(serializeNote) };
  });

  return {
    userBookId: ub.id,
    title: ub.book.title,
    author: ub.book.author,
    format: ub.book.format,
    pages: ub.book.pages,
    highlights: nbHighlights,
    looseNotes: looseNotes.map(serializeNote),
    summaries: summaries.map(serializeSummary),
    counts: {
      highlights: highlights.length,
      notes: notesTotal,
      tags: tagSet.size,
      reviewPending: highlights.filter((h) => h.reviewStatus === "PENDING").length,
    },
  };
}
