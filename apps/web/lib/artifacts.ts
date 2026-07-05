import "server-only";
import { prisma } from "@calmstudy/db";
import { canManage, type SpaceRole } from "./space-shared";
import type { ArtifactDTO, ArtifactRevisionDTO, ArtifactType } from "./artifact-shared";

function docFrom(text: string) {
  return { type: "doc", content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }] };
}

async function nameMap(ids: string[]): Promise<Map<string, string | null>> {
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

async function memberRole(spaceId: string, userId: string): Promise<SpaceRole | null> {
  const m = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId } },
    select: { role: true },
  });
  return (m?.role as SpaceRole) ?? null;
}

/** Lista os artefatos do espaço (agrupados no cliente). Só membros. */
export async function listArtifacts(spaceId: string, userId: string): Promise<ArtifactDTO[] | null> {
  const role = await memberRole(spaceId, userId);
  if (!role) return null;
  const canModerate = canManage(role);

  const rows = await prisma.spaceArtifact.findMany({
    where: { spaceId },
    orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true, type: true, title: true, contentText: true, updatedById: true, createdById: true,
      updatedAt: true, _count: { select: { revisions: true } },
    },
  });
  const names = await nameMap([...new Set(rows.map((r) => r.updatedById))]);

  return rows.map((r) => ({
    id: r.id,
    type: r.type as ArtifactType,
    title: r.title,
    contentText: r.contentText,
    updatedByName: names.get(r.updatedById) ?? null,
    updatedAt: r.updatedAt.toISOString(),
    revisionCount: r._count.revisions,
    canDelete: r.createdById === userId || canModerate,
  }));
}

/** Cria um artefato + primeira versão. */
export async function createArtifact(
  userId: string,
  input: { spaceId: string; type: ArtifactType; title: string; contentText: string },
): Promise<boolean> {
  const role = await memberRole(input.spaceId, userId);
  if (!role) return false;
  const title = input.title.trim();
  const text = input.contentText.trim();
  const content = docFrom(text);
  await prisma.spaceArtifact.create({
    data: {
      spaceId: input.spaceId,
      type: input.type,
      title,
      content,
      contentText: text,
      createdById: userId,
      updatedById: userId,
      revisions: { create: { editedById: userId, title, content, contentText: text } },
    },
  });
  return true;
}

/** Edição colaborativa: qualquer membro edita; cada save vira uma versão. */
export async function updateArtifact(
  userId: string,
  spaceId: string,
  artifactId: string,
  input: { title?: string; contentText: string },
): Promise<boolean> {
  const role = await memberRole(spaceId, userId);
  if (!role) return false;
  const artifact = await prisma.spaceArtifact.findFirst({ where: { id: artifactId, spaceId }, select: { title: true } });
  if (!artifact) return false;

  const title = (input.title ?? artifact.title).trim();
  const text = input.contentText.trim();
  const content = docFrom(text);
  await prisma.spaceArtifact.update({
    where: { id: artifactId },
    data: {
      title,
      content,
      contentText: text,
      updatedById: userId,
      revisions: { create: { editedById: userId, title, content, contentText: text } },
    },
  });
  return true;
}

/** Remove um artefato (autor ou moderador). */
export async function deleteArtifact(userId: string, spaceId: string, artifactId: string): Promise<boolean> {
  const role = await memberRole(spaceId, userId);
  if (!role) return false;
  const a = await prisma.spaceArtifact.findFirst({ where: { id: artifactId, spaceId }, select: { createdById: true } });
  if (!a) return false;
  if (a.createdById !== userId && !canManage(role)) return false;
  await prisma.spaceArtifact.delete({ where: { id: artifactId } });
  return true;
}

/** Histórico de versões de um artefato. */
export async function listRevisions(
  spaceId: string,
  userId: string,
  artifactId: string,
): Promise<ArtifactRevisionDTO[] | null> {
  const role = await memberRole(spaceId, userId);
  if (!role) return null;
  const revs = await prisma.artifactRevision.findMany({
    where: { artifact: { id: artifactId, spaceId } },
    orderBy: { editedAt: "desc" },
    select: { id: true, editedById: true, title: true, contentText: true, editedAt: true },
  });
  const names = await nameMap([...new Set(revs.map((r) => r.editedById))]);
  return revs.map((r) => ({
    id: r.id,
    editorName: names.get(r.editedById) ?? null,
    title: r.title,
    contentText: r.contentText,
    editedAt: r.editedAt.toISOString(),
  }));
}
