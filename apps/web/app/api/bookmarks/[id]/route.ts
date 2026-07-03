import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedBookmark } from "@/lib/study";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedBookmark(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.bookmark.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
