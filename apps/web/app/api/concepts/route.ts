import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, upsertTags } from "@/lib/study";
import { getConcepts } from "@/lib/concepts";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET() {
  return NextResponse.json({ concepts: await getConcepts() });
}

// Cria (ou reaproveita, se já existe pelo título) um conceito.
export async function POST(req: Request) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const { title, tags, ...data } = parsed.data;

  const existing = await prisma.concept.findUnique({
    where: { userId_title: { userId: user.id, title } },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ concept: existing, existed: true });

  const tagIds = tags ? await upsertTags(user.id, tags) : [];
  const concept = await prisma.concept.create({
    data: {
      userId: user.id,
      title,
      ...data,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    select: { id: true },
  });
  return NextResponse.json({ concept }, { status: 201 });
}
