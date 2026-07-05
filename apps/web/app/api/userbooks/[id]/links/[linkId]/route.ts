import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  const { id, linkId } = await params;
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await prisma.pageLink.deleteMany({ where: { id: linkId, userBookId: id } });
  return NextResponse.json({ ok: true });
}
