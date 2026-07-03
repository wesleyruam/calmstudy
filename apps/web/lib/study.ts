import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";

/** Usuário da sessão (usuário padrão até a Auth.js). */
export function currentUser() {
  return getOrCreateDefaultUser();
}

/** Garante que o UserBook pertence ao usuário e não está na lixeira. */
export async function ownedUserBook(userBookId: string, userId: string) {
  return prisma.userBook.findFirst({
    where: { id: userBookId, userId, deletedAt: null },
  });
}

/** Carrega um highlight só se ele pertence ao usuário (via UserBook). */
export async function ownedHighlight(highlightId: string, userId: string) {
  return prisma.highlight.findFirst({
    where: { id: highlightId, userBook: { userId } },
  });
}

/** Carrega uma nota só se ela pertence ao usuário. */
export async function ownedNote(noteId: string, userId: string) {
  return prisma.note.findFirst({ where: { id: noteId, userId } });
}

/** Carrega um marcador só se ele pertence ao usuário (via UserBook). */
export async function ownedBookmark(bookmarkId: string, userId: string) {
  return prisma.bookmark.findFirst({
    where: { id: bookmarkId, userBook: { userId } },
  });
}

/** Carrega um conceito só se ele pertence ao usuário. */
export async function ownedConcept(conceptId: string, userId: string) {
  return prisma.concept.findFirst({ where: { id: conceptId, userId } });
}

/** Carrega um resumo só se ele pertence ao usuário (via UserBook). */
export async function ownedSummary(summaryId: string, userId: string) {
  return prisma.summary.findFirst({
    where: { id: summaryId, userBook: { userId } },
  });
}

/**
 * Recebe nomes de tag (com ou sem '#'), faz upsert por (userId, name)
 * e devolve os ids. Base do sistema de tags universais (módulo 6).
 */
export async function upsertTags(userId: string, names: string[]): Promise<string[]> {
  const clean = Array.from(
    new Set(
      names
        .map((n) => n.trim().replace(/^#/, "").trim())
        .filter((n) => n.length > 0 && n.length <= 40),
    ),
  );
  if (clean.length === 0) return [];
  const tags = await Promise.all(
    clean.map((name) =>
      prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
        select: { id: true },
      }),
    ),
  );
  return tags.map((t) => t.id);
}
