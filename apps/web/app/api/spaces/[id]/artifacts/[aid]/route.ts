import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { deleteArtifact, updateArtifact } from "@/lib/artifacts";

export const runtime = "nodejs";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  contentText: z.string().trim().min(1).max(20000),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; aid: string }> },
) {
  const { id, aid } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const ok = await updateArtifact(user.id, id, aid, parsed.data);
  if (!ok) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; aid: string }> },
) {
  const { id, aid } = await params;
  const user = await currentUser();
  const ok = await deleteArtifact(user.id, id, aid);
  if (!ok) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
