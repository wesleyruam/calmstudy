import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser, enqueueDocument } from "@calmstudy/infra";

export const runtime = "nodejs";

// Enfileira a geração de capa (coverOnly) para livros já importados sem capa.
// Cobre PDF (render), EPUB/CBZ (imagem embutida) e MOBI (EXTH, best-effort).
export async function POST() {
  const user = await getOrCreateDefaultUser();
  const books = await prisma.book.findMany({
    where: {
      format: { in: ["PDF", "EPUB", "MOBI", "CBZ"] },
      coverUrl: null,
      status: "READY",
      userBooks: { some: { userId: user.id } },
    },
    select: { id: true, fileKey: true, format: true },
  });

  for (const b of books) {
    await enqueueDocument({ bookId: b.id, fileKey: b.fileKey, format: b.format, coverOnly: true });
  }

  return NextResponse.json({ enqueued: books.length });
}
