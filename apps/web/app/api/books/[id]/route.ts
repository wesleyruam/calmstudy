import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser, FilesystemStorage, deleteCover } from "@calmbook/infra";

export const runtime = "nodejs";

const storage = new FilesystemStorage();

// Confirma que o livro pertence ao usuário (há um UserBook dele para este Book).
async function ownedBook(bookId: string, userId: string) {
  const ub = await prisma.userBook.findFirst({
    where: { bookId, userId },
    include: { book: true },
  });
  return ub?.book ?? null;
}

const PatchSchema = z.object({ title: z.string().trim().min(1).max(300) });

// Renomear (editar título do livro).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Título inválido." }, { status: 400 });
  }
  const user = await getOrCreateDefaultUser();
  const book = await ownedBook(id, user.id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await prisma.book.update({ where: { id }, data: { title: parsed.data.title } });
  return NextResponse.json({ ok: true });
}

// Excluir o livro: remove o arquivo, a capa e o registro (cascata apaga marcações).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateDefaultUser();
  const book = await ownedBook(id, user.id);
  if (!book) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await storage.delete(book.fileKey).catch(() => {});
  await deleteCover(id);
  await prisma.book.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
