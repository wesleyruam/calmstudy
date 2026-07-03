import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["PAGES", "MINUTES", "CHAPTER", "CUSTOM"]).optional(),
  target: z.number().int().min(1).max(100000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const goal = await prisma.goal.create({ data: { userBookId: id, ...parsed.data } });
  return NextResponse.json(
    { goal: { id: goal.id, title: goal.title, kind: goal.kind, target: goal.target, done: goal.done } },
    { status: 201 },
  );
}
