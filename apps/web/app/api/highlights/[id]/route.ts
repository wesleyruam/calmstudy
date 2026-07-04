import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedHighlight, upsertTags } from "@/lib/study";
import { serializeHighlight, HIGHLIGHT_CATEGORIES } from "@/lib/highlight-shared";

export const runtime = "nodejs";

const PatchSchema = z.object({
  category: z.enum(HIGHLIGHT_CATEGORIES).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  chapter: z.string().max(200).nullable().optional(),
  observation: z.string().max(2000).nullable().optional(),
  priority: z.enum(["LOW", "MED", "HIGH"]).nullable().optional(),
  favorite: z.boolean().optional(),
  reviewStatus: z.enum(["NONE", "PENDING", "REVIEWED", "MASTERED"]).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const existing = await ownedHighlight(id, user.id);
  if (!existing) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { tags, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };

  // Mantém a agenda de revisão coerente com o rótulo (módulo 24):
  // PENDING entra na fila (vence agora); demais saem da rotação.
  if (rest.reviewStatus === "PENDING") {
    if (!existing.nextReviewAt) data.nextReviewAt = new Date();
  } else if (rest.reviewStatus && rest.reviewStatus !== "REVIEWED") {
    data.nextReviewAt = null;
  }

  if (tags) {
    const tagIds = await upsertTags(user.id, tags);
    await prisma.$transaction([
      prisma.highlightTag.deleteMany({ where: { highlightId: id } }),
      prisma.highlightTag.createMany({
        data: tagIds.map((tagId) => ({ highlightId: id, tagId })),
        skipDuplicates: true,
      }),
    ]);
  }

  const highlight = await prisma.highlight.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } }, _count: { select: { notes: true } } },
  });
  return NextResponse.json({ highlight: serializeHighlight(highlight) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const existing = await ownedHighlight(id, user.id);
  if (!existing) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await prisma.highlight.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
