import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";
import { roleOf } from "@/lib/spaces";

export const runtime = "nodejs";

const Schema = z.object({ text: z.string().trim().min(1).max(280) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Texto inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await roleOf(id, user.id))) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  const objective = await prisma.spaceObjective.create({ data: { spaceId: id, text: parsed.data.text } });
  return NextResponse.json({ objective: { id: objective.id, text: objective.text, done: objective.done } }, { status: 201 });
}
