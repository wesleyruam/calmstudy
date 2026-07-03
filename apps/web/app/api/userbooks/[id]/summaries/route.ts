import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";
import { serializeSummary } from "@/lib/summary-shared";

export const runtime = "nodejs";

const CreateSchema = z.object({
  chapter: z.string().max(200).optional(),
  title: z.string().max(200).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentText: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  const summaries = await prisma.summary.findMany({
    where: { userBookId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ summaries: summaries.map(serializeSummary) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { content, ...rest } = parsed.data;
  const summary = await prisma.summary.create({
    data: { userBookId: id, content: (content ?? { type: "doc", content: [] }) as object, ...rest },
  });
  return NextResponse.json({ summary: serializeSummary(summary) }, { status: 201 });
}
