import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";
import { setSpaceVisibility } from "@/lib/spaces";

export const runtime = "nodejs";

const PatchSchema = z.object({ visibility: z.enum(["PRIVATE", "PUBLIC"]) });

// Alterna visibilidade do espaço (privado/público) — só o dono.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const ok = await setSpaceVisibility(id, user.id, parsed.data.visibility);
  if (!ok) return NextResponse.json({ error: "Só o dono pode alterar." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

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
