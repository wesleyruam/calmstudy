import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedGoal } from "@/lib/study";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  target: z.number().int().min(1).max(100000).nullable().optional(),
  done: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedGoal(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const goal = await prisma.goal.update({ where: { id }, data: parsed.data });
  return NextResponse.json({
    goal: { id: goal.id, title: goal.title, kind: goal.kind, target: goal.target, done: goal.done },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedGoal(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
