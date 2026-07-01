import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser } from "@calmbook/infra";

export const runtime = "nodejs";

const BodySchema = z.object({
  userBookId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

// Atribui ou remove um livro de uma prateleira (N:N), checando posse dos dois lados.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: shelfId } = await params;
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const { userBookId, action } = parsed.data;
  const user = await getOrCreateDefaultUser();

  // garante que prateleira e userbook são do usuário
  const [shelf, ub] = await Promise.all([
    prisma.shelf.findFirst({ where: { id: shelfId, userId: user.id } }),
    prisma.userBook.findFirst({ where: { id: userBookId, userId: user.id } }),
  ]);
  if (!shelf || !ub) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  if (action === "add") {
    await prisma.userBookShelf.upsert({
      where: { userBookId_shelfId: { userBookId, shelfId } },
      create: { userBookId, shelfId },
      update: {},
    });
  } else {
    await prisma.userBookShelf.deleteMany({ where: { userBookId, shelfId } });
  }
  return NextResponse.json({ ok: true });
}
