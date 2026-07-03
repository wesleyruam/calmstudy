import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedNote, upsertTags } from "@/lib/study";
import { serializeNote } from "@/lib/note-shared";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().max(300).nullable().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  contentText: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  if (!(await ownedNote(id, user.id))) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  const { tags, content, ...data } = parsed.data;

  if (tags) {
    const tagIds = await upsertTags(user.id, tags);
    await prisma.$transaction([
      prisma.noteTag.deleteMany({ where: { noteId: id } }),
      prisma.noteTag.createMany({
        data: tagIds.map((tagId) => ({ noteId: id, tagId })),
        skipDuplicates: true,
      }),
    ]);
  }

  const note = await prisma.note.update({
    where: { id },
    data: { ...data, ...(content ? { content: content as object } : {}) },
    include: { tags: { include: { tag: true } } },
  });
  return NextResponse.json({ note: serializeNote(note) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedNote(id, user.id))) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }
  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
