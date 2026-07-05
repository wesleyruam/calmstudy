import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { reportContribution } from "@/lib/contributions";

export const runtime = "nodejs";

const Schema = z.object({ reason: z.string().trim().max(500).optional() });

// Denuncia uma contribuição — qualquer usuário logado (moderação leve, Fase 4).
export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  const reason = parsed.success ? parsed.data.reason : undefined;
  const user = await currentUser();
  const ok = await reportContribution(user.id, cid, reason);
  if (!ok) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
