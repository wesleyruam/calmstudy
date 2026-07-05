import { NextResponse } from "next/server";
import { currentUser } from "@/lib/study";
import { deleteContribution } from "@/lib/contributions";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const user = await currentUser();
  const ok = await deleteContribution(user.id, id, cid);
  if (!ok) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
