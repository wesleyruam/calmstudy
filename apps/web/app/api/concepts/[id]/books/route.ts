import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedConcept, ownedUserBook } from "@/lib/study";
import { getConceptDetail } from "@/lib/concepts";

export const runtime = "nodejs";

const Schema = z.object({
  userBookId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

// Relaciona/desrelaciona um livro a um conceito.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedConcept(id, user.id)) || !(await ownedUserBook(parsed.data.userBookId, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const key = { conceptId: id, userBookId: parsed.data.userBookId };
  if (parsed.data.action === "add") {
    await prisma.conceptBook.upsert({
      where: { conceptId_userBookId: key },
      create: key,
      update: {},
    });
  } else {
    await prisma.conceptBook.deleteMany({ where: key });
  }
  return NextResponse.json({ concept: await getConceptDetail(id) });
}
