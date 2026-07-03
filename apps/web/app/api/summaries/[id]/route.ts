import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedSummary } from "@/lib/study";
import { serializeSummary } from "@/lib/summary-shared";

export const runtime = "nodejs";

const PatchSchema = z.object({
  chapter: z.string().max(200).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentText: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedSummary(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { content, ...data } = parsed.data;
  const summary = await prisma.summary.update({
    where: { id },
    data: { ...data, ...(content ? { content: content as object } : {}) },
  });
  return NextResponse.json({ summary: serializeSummary(summary) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedSummary(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.summary.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
