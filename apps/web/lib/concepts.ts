import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";
import { serializeHighlight } from "./highlight-shared";
import { serializeNote } from "./note-shared";
import type {
  ConceptDetail,
  ConceptListItem,
  ConceptLinkDTO,
  GraphData,
} from "./concept-shared";

// Lista de conceitos (base de conhecimento — módulo 22).
export async function getConcepts(): Promise<ConceptListItem[]> {
  const user = await currentUser();
  const concepts = await prisma.concept.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { linksFrom: true, linksTo: true, books: true, highlights: true, notes: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return concepts.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    color: c.color,
    favorite: c.favorite,
    counts: {
      links: c._count.linksFrom + c._count.linksTo,
      books: c._count.books,
      highlights: c._count.highlights,
      notes: c._count.notes,
    },
    updatedAt: c.updatedAt.toISOString(),
  }));
}

// Detalhe de um conceito (página do conceito — módulos 7/8).
export async function getConceptDetail(id: string): Promise<ConceptDetail | null> {
  const user = await currentUser();
  const c = await prisma.concept.findFirst({
    where: { id, userId: user.id },
    include: {
      tags: { include: { tag: true } },
      books: { include: { userBook: { include: { book: { select: { title: true } } } } } },
      highlights: {
        include: {
          highlight: {
            include: {
              tags: { include: { tag: true } },
              notes: { include: { tags: { include: { tag: true } } } },
              _count: { select: { notes: true } },
              userBook: { include: { book: { select: { title: true } } } },
            },
          },
        },
      },
      linksFrom: { include: { to: { select: { id: true, title: true } } } },
      linksTo: { include: { from: { select: { id: true, title: true } } } },
    },
  });
  if (!c) return null;

  const links: ConceptLinkDTO[] = [
    ...c.linksFrom.map((l) => ({
      linkId: l.id,
      conceptId: l.to.id,
      title: l.to.title,
      label: l.label,
    })),
    ...c.linksTo.map((l) => ({
      linkId: l.id,
      conceptId: l.from.id,
      title: l.from.title,
      label: l.label,
    })),
  ].sort((a, b) => a.title.localeCompare(b.title));

  return {
    id: c.id,
    title: c.title,
    description: c.description,
    content: (c.content ?? { type: "doc" }) as ConceptDetail["content"],
    contentText: c.contentText,
    color: c.color,
    favorite: c.favorite,
    tags: c.tags.map((t) => t.tag.name),
    links,
    books: c.books.map((b) => ({ userBookId: b.userBookId, title: b.userBook.book.title })),
    highlights: c.highlights.map((ch) => ({
      ...serializeHighlight(ch.highlight),
      userBookId: ch.highlight.userBookId,
      bookTitle: ch.highlight.userBook.book.title,
      notes: ch.highlight.notes.map(serializeNote),
    })),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// Grafo de conceitos (mapa — módulo 23).
export async function getGraph(): Promise<GraphData> {
  const user = await currentUser();
  const [concepts, links] = await Promise.all([
    prisma.concept.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, color: true },
    }),
    prisma.conceptLink.findMany({
      where: { from: { userId: user.id } },
      select: { fromId: true, toId: true, label: true },
    }),
  ]);

  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.fromId, (degree.get(l.fromId) ?? 0) + 1);
    degree.set(l.toId, (degree.get(l.toId) ?? 0) + 1);
  }

  return {
    nodes: concepts.map((c) => ({
      id: c.id,
      title: c.title,
      color: c.color,
      degree: degree.get(c.id) ?? 0,
    })),
    edges: links.map((l) => ({ from: l.fromId, to: l.toId, label: l.label })),
  };
}
