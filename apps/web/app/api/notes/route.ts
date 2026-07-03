import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook, ownedHighlight, upsertTags } from "@/lib/study";
import { serializeNote } from "@/lib/note-shared";

export const runtime = "nodejs";

const CreateSchema = z.object({
  highlightId: z.string().uuid().optional(),
  userBookId: z.string().uuid().optional(),
  page: z.number().int().min(1).optional(),
  title: z.string().max(300).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentText: z.string().optional(),
  isFreePage: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// Lista notas por highlight ou por livro (?highlightId= | ?userBookId= | ?free=1).
export async function GET(req: Request) {
  const user = await currentUser();
  const url = new URL(req.url);
  const highlightId = url.searchParams.get("highlightId");
  const userBookId = url.searchParams.get("userBookId");
  const free = url.searchParams.get("free");

  const where: Record<string, unknown> = { userId: user.id };
  if (highlightId) where.highlightId = highlightId;
  else if (userBookId) where.userBookId = userBookId;
  else if (free) where.isFreePage = true;

  const notes = await prisma.note.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ notes: notes.map(serializeNote) });
}

// Cria uma nota (ligada a highlight, a livro, ou página livre).
export async function POST(req: Request) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const { highlightId, userBookId, tags, content, ...rest } = parsed.data;

  // Valida a posse do alvo (evita anexar nota a recurso alheio).
  if (highlightId && !(await ownedHighlight(highlightId, user.id))) {
    return NextResponse.json({ error: "Highlight não encontrado." }, { status: 404 });
  }
  if (userBookId && !(await ownedUserBook(userBookId, user.id))) {
    return NextResponse.json({ error: "Livro não encontrado." }, { status: 404 });
  }

  const tagIds = tags ? await upsertTags(user.id, tags) : [];
  const note = await prisma.note.create({
    data: {
      userId: user.id,
      highlightId,
      userBookId,
      content: (content ?? { type: "doc", content: [] }) as object,
      ...rest,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include: { tags: { include: { tag: true } } },
  });
  return NextResponse.json({ note: serializeNote(note) }, { status: 201 });
}
