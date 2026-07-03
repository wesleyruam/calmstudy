import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook, upsertTags } from "@/lib/study";
import { serializeHighlight, HIGHLIGHT_CATEGORIES } from "@/lib/highlight-shared";

export const runtime = "nodejs";

const AnchorSchema = z
  .object({
    page: z.number().int().min(1),
    rects: z
      .array(z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }))
      .optional(),
  })
  .passthrough();

const CreateSchema = z.object({
  page: z.number().int().min(1).optional(),
  chapter: z.string().max(200).optional(),
  category: z.enum(HIGHLIGHT_CATEGORIES).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  text: z.string().min(1),
  observation: z.string().max(2000).optional(),
  anchor: AnchorSchema,
  priority: z.enum(["LOW", "MED", "HIGH"]).optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// Lista os destaques de um livro (para renderizar no leitor e no caderno).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const ub = await ownedUserBook(id, user.id);
  if (!ub) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const highlights = await prisma.highlight.findMany({
    where: { userBookId: id },
    include: { tags: { include: { tag: true } }, _count: { select: { notes: true } } },
    orderBy: [{ page: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ highlights: highlights.map(serializeHighlight) });
}

// Cria um destaque rico.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const ub = await ownedUserBook(id, user.id);
  if (!ub) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { tags, anchor, ...data } = parsed.data;
  const tagIds = tags ? await upsertTags(user.id, tags) : [];

  const highlight = await prisma.highlight.create({
    data: {
      userBookId: id,
      ...data,
      anchor: anchor as object,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include: { tags: { include: { tag: true } }, _count: { select: { notes: true } } },
  });
  return NextResponse.json({ highlight: serializeHighlight(highlight) }, { status: 201 });
}
