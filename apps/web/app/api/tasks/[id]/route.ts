import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedTask } from "@/lib/study";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  done: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedTask(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const task = await prisma.bookTask.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ task: { id: task.id, title: task.title, done: task.done, order: task.order } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedTask(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.bookTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
