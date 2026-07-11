import "server-only";
import { prisma } from "@calmstudy/db";
import { publish } from "@calmstudy/infra";
import { canManage, type SpaceRole } from "./space-shared";
import type { ContributionDTO, ContributionKind } from "./contribution-shared";

// Canais de tempo real (SSE): discussão do espaço e camada da comunidade (por livro).
const spaceChannel = (spaceId: string) => `space:${spaceId}`;
const bookChannel = (bookId: string) => `book:${bookId}`;
type RtType = "created" | "updated" | "deleted";
const emit = (channel: string, type: RtType, page: number | null, id: string) =>
  void publish(channel, { type, page, id });

/** Espaços do usuário que usam este livro (seletor de camada no leitor). */
export async function getSpacesForBook(userId: string, bookId: string) {
  const members = await prisma.spaceMember.findMany({
    where: { userId, space: { bookId } },
    include: { space: { select: { id: true, name: true } } },
    orderBy: { joinedAt: "asc" },
  });
  return members.map((m) => ({ id: m.space.id, name: m.space.name, role: m.role as SpaceRole }));
}

/** Nº de contribuições públicas para este livro (habilita a camada Comunidade). */
export function countPublicContributions(bookId: string) {
  return prisma.contribution.count({ where: { bookId, visibility: "PUBLIC", deletedAt: null } });
}

type Row = {
  id: string;
  kind: string;
  page: number | null;
  quotedText: string | null;
  contentText: string;
  visibility: string;
  authorId: string;
  createdAt: Date;
  author: { id: string; name: string | null };
  space?: { name: string } | null;
  _count?: { reports: number } | null;
};

function toDTO(
  r: Row,
  viewerId: string,
  canModerate: boolean,
  opts: { withSpaceName?: boolean; withReports?: boolean } = {},
  replies: ContributionDTO[] = [],
): ContributionDTO {
  return {
    id: r.id,
    kind: r.kind as ContributionKind,
    page: r.page,
    quotedText: r.quotedText,
    contentText: r.contentText,
    author: { id: r.author.id, name: r.author.name },
    createdAt: r.createdAt.toISOString(),
    canDelete: r.authorId === viewerId || canModerate,
    isPublic: r.visibility === "PUBLIC",
    canSetVisibility: r.authorId === viewerId,
    ...(opts.withSpaceName ? { spaceName: r.space?.name ?? null } : {}),
    ...(opts.withReports ? { reportCount: r._count?.reports ?? 0 } : {}),
    replies,
  };
}

const SELECT = {
  id: true, kind: true, page: true, quotedText: true, contentText: true, visibility: true,
  authorId: true, createdAt: true, author: { select: { id: true, name: true } },
} as const;

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
  const opts = { withReports: canModerate };

  const tops = await prisma.contribution.findMany({
    where: { spaceId, page, parentId: null, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      ...SELECT,
      _count: { select: { reports: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { ...SELECT, _count: { select: { reports: true } } },
      },
    },
  });

  return tops.map((t) =>
    toDTO(t, userId, canModerate, opts, t.replies.map((r) => toDTO(r, userId, canModerate, opts))),
  );
}

/** Camada da comunidade: contribuições PÚBLICAS de qualquer espaço, por livro+página. */
export async function getPublicPageContributions(
  bookId: string,
  userId: string,
  page: number,
): Promise<ContributionDTO[]> {
  const tops = await prisma.contribution.findMany({
    where: { bookId, page, parentId: null, visibility: "PUBLIC", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      ...SELECT,
      space: { select: { name: true } },
      replies: {
        where: { deletedAt: null, visibility: "PUBLIC" },
        orderBy: { createdAt: "asc" },
        select: { ...SELECT, space: { select: { name: true } } },
      },
    },
  });
  const opts = { withSpaceName: true };
  return tops.map((t) =>
    toDTO(t, userId, false, opts, t.replies.map((r) => toDTO(r, userId, false, opts))),
  );
}

/** Cria uma contribuição (ação explícita na camada do espaço). Nasce SPACE. */
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
    select: SELECT,
  });
  // nasce SPACE → empurra só para a discussão do espaço
  emit(spaceChannel(input.spaceId), "created", created.page, created.id);
  return toDTO(created, userId, canManage(member.role as SpaceRole));
}

/** Alterna a visibilidade (SPACE/PUBLIC) — só o autor. Nunca escala sozinha. */
export async function setVisibility(
  userId: string,
  id: string,
  visibility: "SPACE" | "PUBLIC",
): Promise<boolean> {
  const c = await prisma.contribution.findUnique({
    where: { id },
    select: { authorId: true, spaceId: true, bookId: true, page: true },
  });
  if (!c || c.authorId !== userId) return false;
  await prisma.contribution.update({ where: { id }, data: { visibility } });
  // atualiza a discussão do espaço; na comunidade, aparece (PUBLIC) ou some (SPACE)
  emit(spaceChannel(c.spaceId), "updated", c.page, id);
  emit(bookChannel(c.bookId), visibility === "PUBLIC" ? "created" : "deleted", c.page, id);
  return true;
}

/** Denuncia uma contribuição (moderação). Idempotente por usuário. */
export async function reportContribution(userId: string, id: string, reason?: string): Promise<boolean> {
  const c = await prisma.contribution.findUnique({ where: { id }, select: { id: true } });
  if (!c) return false;
  await prisma.contributionReport.upsert({
    where: { contributionId_reporterId: { contributionId: id, reporterId: userId } },
    update: { reason: reason ?? null },
    create: { contributionId: id, reporterId: userId, reason: reason ?? null },
  });
  return true;
}

/** Remove uma contribuição (autor ou moderador do espaço dela). Cascata nas respostas. */
export async function deleteContribution(userId: string, id: string): Promise<boolean> {
  const c = await prisma.contribution.findUnique({
    where: { id },
    select: { authorId: true, spaceId: true, bookId: true, page: true, visibility: true },
  });
  if (!c) return false;
  const isAuthor = c.authorId === userId;
  if (!isAuthor) {
    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: c.spaceId, userId } },
      select: { role: true },
    });
    if (!member || !canManage(member.role as SpaceRole)) return false;
  }
  await prisma.contribution.delete({ where: { id } });
  emit(spaceChannel(c.spaceId), "deleted", c.page, id);
  if (c.visibility === "PUBLIC") emit(bookChannel(c.bookId), "deleted", c.page, id);
  return true;
}
