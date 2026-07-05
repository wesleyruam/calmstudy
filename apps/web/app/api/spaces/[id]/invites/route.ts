import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { createInvite } from "@/lib/spaces";

export const runtime = "nodejs";

const Schema = z.object({ role: z.enum(["MODERATOR", "MEMBER", "VIEWER"]).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => ({})));
  const role = parsed.success ? parsed.data.role ?? "MEMBER" : "MEMBER";
  const user = await currentUser();
  const code = await createInvite(id, user.id, role);
  if (!code) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json({ code }, { status: 201 });
}
