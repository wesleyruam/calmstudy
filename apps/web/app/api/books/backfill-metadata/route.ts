import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { enqueueDocument } from "@calmstudy/infra";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

// Reprocessa EPUBs importados ANTES do EpubParser existir: naquela época não
// havia parser, então o título ficou = nome do arquivo e o conteúdo não entrou
// na busca. Alvo seguro: format EPUB + textContent NULL (nunca foi parseado) —
// não toca em nada já parseado nem em edições futuras. O job normal (não
// coverOnly) roda o parser e preenche título/autor/idioma/ISBN/texto.
export async function POST() {
  const user = await currentUser();
  const books = await prisma.book.findMany({
    where: {
      format: "EPUB",
      textContent: null,
      status: { in: ["READY", "FAILED"] },
      userBooks: { some: { userId: user.id } },
    },
    select: { id: true, fileKey: true, format: true },
  });

  for (const b of books) {
    await enqueueDocument({ bookId: b.id, fileKey: b.fileKey, format: b.format });
  }

  return NextResponse.json({ enqueued: books.length });
}
