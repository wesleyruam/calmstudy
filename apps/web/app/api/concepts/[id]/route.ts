import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedConcept, upsertTags } from "@/lib/study";
import { getConceptDetail } from "@/lib/concepts";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentText: z.string().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getConceptDetail(id);
  if (!detail) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ concept: detail });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedConcept(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { tags, content, ...data } = parsed.data;
  if (tags) {
    const tagIds = await upsertTags(user.id, tags);
    await prisma.$transaction([
      prisma.conceptTag.deleteMany({ where: { conceptId: id } }),
      prisma.conceptTag.createMany({
        data: tagIds.map((tagId) => ({ conceptId: id, tagId })),
        skipDuplicates: true,
      }),
    ]);
  }
  await prisma.concept.update({
    where: { id },
    data: { ...data, ...(content ? { content: content as object } : {}) },
  });
  return NextResponse.json({ concept: await getConceptDetail(id) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedConcept(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.concept.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
