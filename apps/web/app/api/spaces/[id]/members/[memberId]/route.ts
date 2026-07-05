import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";
import { roleOf } from "@/lib/spaces";
import { canManage } from "@/lib/space-shared";

export const runtime = "nodejs";

const PatchSchema = z.object({
  shareProgress: z.boolean().optional(),
  role: z.enum(["MODERATOR", "MEMBER", "VIEWER"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();

  const target = await prisma.spaceMember.findFirst({ where: { id: memberId, spaceId: id } });
  if (!target) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  // shareProgress: consentimento — cada um controla só o seu.
  if (typeof parsed.data.shareProgress === "boolean") {
    if (target.userId !== user.id)
      return NextResponse.json({ error: "Só você controla seu progresso." }, { status: 403 });
    await prisma.spaceMember.update({ where: { id: memberId }, data: { shareProgress: parsed.data.shareProgress } });
  }

  // role: apenas gestores mudam o papel de não-donos.
  if (parsed.data.role) {
    const myRole = await roleOf(id, user.id);
    if (!myRole || !canManage(myRole) || target.role === "OWNER")
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    await prisma.spaceMember.update({ where: { id: memberId }, data: { role: parsed.data.role } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  const user = await currentUser();
  const target = await prisma.spaceMember.findFirst({ where: { id: memberId, spaceId: id } });
  if (!target) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const isSelf = target.userId === user.id;
  if (isSelf) {
    if (target.role === "OWNER")
      return NextResponse.json({ error: "O dono não pode sair; exclua o espaço." }, { status: 400 });
  } else {
    const myRole = await roleOf(id, user.id);
    if (!myRole || !canManage(myRole) || target.role === "OWNER")
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  await prisma.spaceMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
