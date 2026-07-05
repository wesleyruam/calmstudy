import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

const PatchSchema = z.object({
  lastPage: z.number().int().min(0).optional(),
  progress: z.number().min(0).max(1).optional(),
  zoom: z.number().min(0.1).max(8).optional(),
  status: z.enum(["WANT_TO_READ", "READING", "FINISHED", "PAUSED"]).optional(),
  favorite: z.boolean().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  viewMode: z.string().max(20).optional(),
});

// Atualiza o estado de leitura do usuário (página atual, progresso, zoom).
// Base da sincronização — reabrir restaura onde parou.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  // lastReadAt só avança em ações de leitura (não em favoritar/avaliar).
  const touchedReading =
    parsed.data.lastPage !== undefined || parsed.data.progress !== undefined;

  const user = await currentUser();
  const result = await prisma.userBook.updateMany({
    where: { id, userId: user.id },
    data: { ...parsed.data, ...(touchedReading ? { lastReadAt: new Date() } : {}) },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
