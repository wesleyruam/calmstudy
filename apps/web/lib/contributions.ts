import "server-only";
import { prisma } from "@calmstudy/db";
import { canManage, type SpaceRole } from "./space-shared";
import type { ContributionDTO, ContributionKind } from "./contribution-shared";

/** Espaços do usuário que usam este livro (seletor de camada no leitor). */
export async function getSpacesForBook(userId: string, bookId: string) {
  const members = await prisma.spaceMember.findMany({
    where: { userId, space: { bookId } },
    include: { space: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return members.map((m) => ({ id: m.space.id, name: m.space.name, role: m.role as SpaceRole }));
}

type Row = {
  id: string;
  kind: string;
  page: number | null;
  quotedText: string | null;
  contentText: string;
  authorId: string;
  createdAt: Date;
  author: { id: string; name: string | null };
};

function toDTO(r: Row, viewerId: string, canModerate: boolean, replies: ContributionDTO[] = []): ContributionDTO {
  return {
    id: r.id,
    kind: r.kind as ContributionKind,
    page: r.page,
    quotedText: r.quotedText,
    contentText: r.contentText,
    author: { id: r.author.id, name: r.author.name },
    createdAt: r.createdAt.toISOString(),
    canDelete: r.authorId === viewerId || canModerate,
    replies,
  };
}

/** Threads (topo + respostas) de uma página, para um membro do espaço. */
export async function listPageContributions(
  spaceId: string,
  userId: string,
  page: number,
): Promise<ContributionDTO[] | null> {
  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    select: { role: true },
  });
  if (!member) return null;
  const canModerate = canManage(member.role as SpaceRole);

  const select = {
    id: true,
    kind: true,
    page: true,
    quotedText: true,
    contentText: true,
    authorId: true,
    createdAt: true,
    author: { select: { id: true, name: true } },
  };

  const tops = await prisma.contribution.findMany({
    where: { spaceId, page, parentId: null, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { ...select, replies: { where: { deletedAt: null }, orderBy: { createdAt: "asc" }, select } },
  });

  return tops.map((t) =>
    toDTO(t, userId, canModerate, t.replies.map((r) => toDTO(r, userId, canModerate))),
  );
}

/** Cria uma contribuição (ação explícita na camada do espaço). */
export async function createContribution(
  userId: string,
  input: { spaceId: string; kind: ContributionKind; page: number; quotedText?: string; contentText: string; parentId?: string },
): Promise<ContributionDTO | null> {
  const space = await prisma.studySpace.findUnique({
    where: { id: input.spaceId },
    select: { bookId: true, members: { where: { userId }, select: { role: true } } },
  });
  const member = space?.members[0];
  if (!space || !member) return null;

  const text = input.contentText.trim();
  const created = await prisma.contribution.create({
    data: {
      spaceId: input.spaceId,
      authorId: userId,
      bookId: space.bookId,
      kind: input.kind,
      anchorType: input.quotedText ? "RANGE" : "PAGE",
      page: input.page,
      quotedText: input.quotedText ?? null,
      parentId: input.parentId ?? null,
      content: { type: "doc", content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }] },
      contentText: text,
    },
    select: {
      id: true, kind: true, page: true, quotedText: true, contentText: true,
      authorId: true, createdAt: true, author: { select: { id: true, name: true } },
    },
  });
  return toDTO(created, userId, canManage(member.role as SpaceRole));
}

/** Remove uma contribuição (autor ou moderador). Cascata apaga respostas. */
export async function deleteContribution(userId: string, spaceId: string, id: string): Promise<boolean> {
  const [c, member] = await Promise.all([
    prisma.contribution.findFirst({ where: { id, spaceId }, select: { authorId: true } }),
    prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId, userId } }, select: { role: true } }),
  ]);
  if (!c || !member) return false;
  if (c.authorId !== userId && !canManage(member.role as SpaceRole)) return false;
  await prisma.contribution.delete({ where: { id } });
  return true;
}
