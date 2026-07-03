import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";

export const runtime = "nodejs";

const CreateSchema = z.object({ title: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const count = await prisma.bookTask.count({ where: { userBookId: id } });
  const task = await prisma.bookTask.create({
    data: { userBookId: id, title: parsed.data.title, order: count },
  });
  return NextResponse.json(
    { task: { id: task.id, title: task.title, done: task.done, order: task.order } },
    { status: 201 },
  );
}
