import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";

export const runtime = "nodejs";

const StartSchema = z.object({ startPage: z.number().int().min(0).optional() });

// Inicia uma sessão de estudo (módulo 11) ao abrir o livro.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = StartSchema.safeParse(await req.json().catch(() => ({})));
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const session = await prisma.studySession.create({
    data: { userBookId: id, startPage: parsed.success ? parsed.data.startPage : undefined },
    select: { id: true },
  });
  return NextResponse.json({ session }, { status: 201 });
}
