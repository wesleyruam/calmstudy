import { NextResponse } from "next/server";
import { currentUser } from "@/lib/study";
import { joinPublicSpace } from "@/lib/spaces";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const ok = await joinPublicSpace(user.id, id);
  if (!ok) return NextResponse.json({ error: "Espaço não é público." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
