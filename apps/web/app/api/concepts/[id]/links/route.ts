import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedConcept } from "@/lib/study";
import { getConceptDetail } from "@/lib/concepts";

export const runtime = "nodejs";

const Schema = z
  .object({
    toId: z.string().uuid().optional(),
    toTitle: z.string().trim().min(1).max(120).optional(),
    label: z.string().max(60).optional(),
  })
  .refine((d) => d.toId || d.toTitle, { message: "Informe toId ou toTitle." });

// Liga este conceito a outro (por id ou por título, criando o alvo se preciso).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedConcept(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  let toId = parsed.data.toId;
  if (!toId && parsed.data.toTitle) {
    const target = await prisma.concept.upsert({
      where: { userId_title: { userId: user.id, title: parsed.data.toTitle } },
      create: { userId: user.id, title: parsed.data.toTitle },
      update: {},
      select: { id: true },
    });
    toId = target.id;
  }
  if (!toId || toId === id)
    return NextResponse.json({ error: "Alvo inválido." }, { status: 400 });
  if (!(await ownedConcept(toId, user.id)))
    return NextResponse.json({ error: "Alvo não encontrado." }, { status: 404 });

  // evita duplicar em qualquer direção
  const exists = await prisma.conceptLink.findFirst({
    where: {
      OR: [
        { fromId: id, toId },
        { fromId: toId, toId: id },
      ],
    },
  });
  if (!exists) {
    await prisma.conceptLink.create({ data: { fromId: id, toId, label: parsed.data.label } });
  }
  return NextResponse.json({ concept: await getConceptDetail(id) });
}
