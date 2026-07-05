import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@calmstudy/db";
import { canManage, type SpaceDetail, type SpaceListItem, type SpaceRole } from "./space-shared";

/** Papel do usuário no espaço (ou null se não for membro). */
export async function roleOf(spaceId: string, userId: string): Promise<SpaceRole | null> {
  const m = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    select: { role: true },
  });
  return (m?.role as SpaceRole) ?? null;
}

/** Livros do usuário para o seletor ao criar um espaço. */
export async function myBooksForPicker(userId: string) {
  const ubs = await prisma.userBook.findMany({
    where: { userId, deletedAt: null, book: { status: "READY" } },
    include: { book: { select: { id: true, title: true } } },
    orderBy: { book: { title: "asc" } },
  });
  return ubs.map((ub) => ({ bookId: ub.book.id, title: ub.book.title }));
}

/** Espaços em que o usuário participa. */
export async function getMySpaces(userId: string): Promise<SpaceListItem[]> {
  const members = await prisma.spaceMember.findMany({
    where: { userId },
    include: {
      space: {
        include: { book: { select: { title: true, coverUrl: true } }, _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });
  return members.map((m) => ({
    id: m.spaceId,
    name: m.space.name,
    bookTitle: m.space.book.title,
    bookCover: m.space.book.coverUrl,
    memberCount: m.space._count.members,
    myRole: m.role as SpaceRole,
  }));
}

/** Cria um espaço a partir de um livro que o usuário possui. Vira OWNER. */
export async function createSpace(
  userId: string,
  input: { name: string; description?: string; bookId: string },
): Promise<string | null> {
  const owns = await prisma.userBook.findFirst({
    where: { userId, bookId: input.bookId, deletedAt: null },
    select: { id: true },
  });
  if (!owns) return null;

  const space = await prisma.studySpace.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      ownerId: userId,
      bookId: input.bookId,
      members: { create: { userId, role: "OWNER", shareProgress: true } },
    },
  });
  return space.id;
}

/** Detalhe do espaço — só se o usuário for membro. */
export async function getSpaceDetail(spaceId: string, userId: string): Promise<SpaceDetail | null> {
  const space = await prisma.studySpace.findUnique({
    where: { id: spaceId },
    include: {
      book: { select: { id: true, title: true, author: true, coverUrl: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { joinedAt: "asc" } },
      objectives: { orderBy: { createdAt: "asc" } },
      invites: true,
    },
  });
  if (!space) return null;

  const me = space.members.find((m) => m.userId === userId);
  if (!me) return null;

  // Progresso de cada membro no livro do espaço (só de quem optou por compartilhar).
  const ubs = await prisma.userBook.findMany({
    where: { bookId: space.bookId, userId: { in: space.members.map((m) => m.userId) } },
    select: { id: true, userId: true, progress: true },
  });
  const progressByUser = new Map(ubs.map((u) => [u.userId, u.progress]));
  const myUb = ubs.find((u) => u.userId === userId);

  const manage = canManage(me.role as SpaceRole);

  return {
    id: space.id,
    name: space.name,
    description: space.description,
    visibility: space.visibility,
    book: {
      userBookId: myUb?.id ?? null,
      title: space.book.title,
      author: space.book.author,
      cover: space.book.coverUrl,
    },
    myRole: me.role as SpaceRole,
    myShareProgress: me.shareProgress,
    members: space.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role as SpaceRole,
      shareProgress: m.shareProgress,
      progress: m.shareProgress ? (progressByUser.get(m.userId) ?? 0) : null,
    })),
    objectives: space.objectives.map((o) => ({ id: o.id, text: o.text, done: o.done })),
    invites: manage ? space.invites.map((i) => ({ code: i.code, role: i.role as SpaceRole })) : [],
  };
}

/** Prévia de um convite (p/ a tela de entrar). null se inválido/expirado. */
export async function getInvitePreview(code: string) {
  const invite = await prisma.spaceInvite.findUnique({
    where: { code },
    include: { space: { include: { book: { select: { title: true } }, _count: { select: { members: true } } } } },
  });
  if (!invite || (invite.expiresAt && invite.expiresAt < new Date())) return null;
  return {
    spaceId: invite.spaceId,
    spaceName: invite.space.name,
    bookTitle: invite.space.book.title,
    memberCount: invite.space._count.members,
  };
}

/** Cria um convite (link) — só quem pode gerenciar. */
export async function createInvite(spaceId: string, userId: string, role: SpaceRole = "MEMBER") {
  const r = await roleOf(spaceId, userId);
  if (!r || !canManage(r)) return null;
  const code = randomBytes(9).toString("base64url");
  await prisma.spaceInvite.create({ data: { spaceId, code, role, createdById: userId } });
  return code;
}

/** Aceita um convite: entra no espaço e ganha acesso ao livro (UserBook). */
export async function acceptInvite(userId: string, code: string): Promise<string | null> {
  const invite = await prisma.spaceInvite.findUnique({ where: { code }, include: { space: true } });
  if (!invite) return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;

  const spaceId = invite.spaceId;
  const already = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
  });
  if (!already) {
    await prisma.spaceMember.create({
      data: { spaceId, userId, role: invite.role },
    });
  }
  // Garante acesso ao livro do espaço (entrar concede leitura do material).
  const hasBook = await prisma.userBook.findFirst({
    where: { userId, bookId: invite.space.bookId },
    select: { id: true },
  });
  if (!hasBook) {
    await prisma.userBook.create({ data: { userId, bookId: invite.space.bookId, status: "READING" } });
  }
  return spaceId;
}
