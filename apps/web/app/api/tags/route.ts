import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

// Todas as tags do usuário, com quantos itens cada uma marca (módulo 6).
export async function GET() {
  const user = await currentUser();
  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { books: true, highlights: true, notes: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    tags: tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      count: t._count.books + t._count.highlights + t._count.notes,
    })),
  });
}
