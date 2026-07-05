import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

// Excluir o espaço — só o dono. Cascata remove membros/convites/objetivos.
// Não apaga nada pessoal (biblioteca/anotações dos membros permanecem).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const space = await prisma.studySpace.findUnique({ where: { id }, select: { ownerId: true } });
  if (!space) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (space.ownerId !== user.id) return NextResponse.json({ error: "Só o dono pode excluir." }, { status: 403 });

  await prisma.studySpace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
