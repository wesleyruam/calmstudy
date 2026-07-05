import { NextResponse } from "next/server";
import { currentUser } from "@/lib/study";
import { listRevisions } from "@/lib/artifacts";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; aid: string }> },
) {
  const { id, aid } = await params;
  const user = await currentUser();
  const revisions = await listRevisions(id, user.id, aid);
  if (revisions === null) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ revisions });
}
