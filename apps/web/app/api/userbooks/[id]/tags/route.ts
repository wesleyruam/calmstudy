import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook, upsertTags } from "@/lib/study";

export const runtime = "nodejs";

const Schema = z.object({ tags: z.array(z.string()).max(50) });

// Define o conjunto de tags de um livro (módulo 6). Set-based: recebe a lista
// desejada, faz upsert das tags e reconcilia UserBookTag.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const owned = await ownedUserBook(id, user.id);
  if (!owned) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const tagIds = await upsertTags(user.id, parsed.data.tags);

  await prisma.$transaction([
    prisma.userBookTag.deleteMany({ where: { userBookId: id } }),
    prisma.userBookTag.createMany({
      data: tagIds.map((tagId) => ({ userBookId: id, tagId })),
      skipDuplicates: true,
    }),
  ]);

  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ tags });
}
