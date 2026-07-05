import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { acceptInvite } from "@/lib/spaces";

export const runtime = "nodejs";

const Schema = z.object({ code: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
  const user = await currentUser();
  const spaceId = await acceptInvite(user.id, parsed.data.code);
  if (!spaceId) return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 404 });
  return NextResponse.json({ spaceId });
}
