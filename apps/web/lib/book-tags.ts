import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";

export interface BookTag {
  id: string;
  name: string;
  color: string | null;
  count: number; // quantos livros a tag marca
}

// Tags aplicadas a livros (módulo 6, nível de biblioteca). Só as que marcam ≥1 livro.
export async function getBookTags(): Promise<BookTag[]> {
  const user = await getOrCreateDefaultUser();
  const tags = await prisma.tag.findMany({
    where: { userId: user.id, books: { some: {} } },
    include: { _count: { select: { books: true } } },
    orderBy: { name: "asc" },
  });
  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    count: t._count.books,
  }));
}
