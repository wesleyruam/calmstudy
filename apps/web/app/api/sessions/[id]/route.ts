import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedSession } from "@/lib/study";

export const runtime = "nodejs";

const PatchSchema = z.object({
  seconds: z.number().int().min(0).max(86400).optional(),
  endPage: z.number().int().min(0).optional(),
  ended: z.boolean().optional(),
});

// Heartbeat / finalização de sessão. `seconds` é o total ativo acumulado.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedSession(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { seconds, endPage, ended } = parsed.data;
  await prisma.studySession.update({
    where: { id },
    data: {
      ...(seconds !== undefined ? { seconds } : {}),
      ...(endPage !== undefined ? { endPage } : {}),
      ...(ended ? { endedAt: new Date() } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}
