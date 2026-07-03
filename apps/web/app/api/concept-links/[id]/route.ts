import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const link = await prisma.conceptLink.findFirst({
    where: { id, from: { userId: user.id } },
  });
  if (!link) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  await prisma.conceptLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
