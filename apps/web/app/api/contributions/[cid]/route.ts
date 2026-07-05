import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { deleteContribution, setVisibility } from "@/lib/contributions";

export const runtime = "nodejs";

const PatchSchema = z.object({ visibility: z.enum(["SPACE", "PUBLIC"]) });

// Alterna a visibilidade (espaço/público) — só o autor.
export async function PATCH(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const ok = await setVisibility(user.id, cid, parsed.data.visibility);
  if (!ok) return NextResponse.json({ error: "Só o autor pode mudar a visibilidade." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

// Remove — autor ou moderador do espaço da contribuição.
export async function DELETE(_req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const { cid } = await params;
  const user = await currentUser();
  const ok = await deleteContribution(user.id, cid);
  if (!ok) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
