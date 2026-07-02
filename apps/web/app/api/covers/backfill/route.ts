import { NextResponse } from "next/server";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser, enqueueDocument } from "@calmbook/infra";

export const runtime = "nodejs";

// Enfileira a geração de capa (coverOnly) para PDFs já importados que ainda não têm capa.
// Usado uma vez para "acender" as capas dos livros antigos.
export async function POST() {
  const user = await getOrCreateDefaultUser();
  const books = await prisma.book.findMany({
    where: {
      format: "PDF",
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
