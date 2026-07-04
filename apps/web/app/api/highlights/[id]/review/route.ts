import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedHighlight } from "@/lib/study";
import { serializeHighlight, reviewIntervalDays } from "@/lib/highlight-shared";

export const runtime = "nodejs";

// Grau de uma revisão (repetição espaçada, módulo 24).
const Schema = z.object({ result: z.enum(["again", "good", "mastered"]) });

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const existing = await ownedHighlight(id, user.id);
  if (!existing) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const now = new Date();
  const count = existing.reviewCount ?? 0;

  let data: {
    reviewStatus: "PENDING" | "MASTERED";
    reviewCount: number;
    lastReviewedAt: Date;
    nextReviewAt: Date | null;
  };

  switch (parsed.data.result) {
    case "again":
      // Errou/quer rever: volta pra fila logo, reinicia a escada.
      data = { reviewStatus: "PENDING", reviewCount: 0, lastReviewedAt: now, nextReviewAt: now };
      break;
    case "good":
      // Acertou: agenda o próximo intervalo da escada.
      data = {
        reviewStatus: "PENDING",
        reviewCount: count + 1,
        lastReviewedAt: now,
        nextReviewAt: new Date(now.getTime() + reviewIntervalDays(count) * DAY_MS),
      };
      break;
    case "mastered":
      // Dominado: sai da rotação.
      data = { reviewStatus: "MASTERED", reviewCount: count + 1, lastReviewedAt: now, nextReviewAt: null };
      break;
  }

  const highlight = await prisma.highlight.update({
    where: { id },
    data,
    include: { tags: { include: { tag: true } }, _count: { select: { notes: true } } },
  });
  return NextResponse.json({ highlight: serializeHighlight(highlight) });
}
