import "server-only";
import { prisma } from "@calmbook/db";
import { getOrCreateDefaultUser } from "@calmbook/infra";

export interface ShelfItem {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  count: number;
}

export async function getShelves(): Promise<ShelfItem[]> {
  const user = await getOrCreateDefaultUser();
  const shelves = await prisma.shelf.findMany({
    where: { userId: user.id },
    include: { _count: { select: { books: true } } },
    orderBy: { name: "asc" },
  });
  return shelves.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    icon: s.icon,
    count: s._count.books,
  }));
}
