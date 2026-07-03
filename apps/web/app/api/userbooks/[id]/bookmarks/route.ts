import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";
import { BOOKMARK_KEYS, type BookmarkDTO } from "@/lib/bookmark-shared";

export const runtime = "nodejs";

interface BookmarkRow {
  id: string;
  page: number;
  category: string | null;
  title: string | null;
  createdAt?: Date | string;
}
function serialize(b: BookmarkRow): BookmarkDTO {
  return {
    id: b.id,
    page: b.page,
    category: b.category,
    title: b.title,
    createdAt: new Date(b.createdAt ?? Date.now()).toISOString(),
  };
}

const CreateSchema = z.object({
  page: z.number().int().min(1),
  category: z.enum(BOOKMARK_KEYS).optional(),
  title: z.string().max(200).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const bookmarks = await prisma.bookmark.findMany({
    where: { userBookId: id },
    orderBy: { page: "asc" },
  });
  return NextResponse.json({ bookmarks: bookmarks.map(serialize) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const bookmark = await prisma.bookmark.create({
    data: { userBookId: id, ...parsed.data },
  });
  return NextResponse.json({ bookmark: serialize(bookmark) }, { status: 201 });
}
