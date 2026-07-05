import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";
import { roleOf } from "@/lib/spaces";

export const runtime = "nodejs";

const Schema = z.object({ done: z.boolean().optional(), text: z.string().trim().min(1).max(280).optional() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; oid: string }> },
) {
  const { id, oid } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await roleOf(id, user.id))) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  await prisma.spaceObjective.updateMany({ where: { id: oid, spaceId: id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; oid: string }> },
) {
  const { id, oid } = await params;
  const user = await currentUser();
  if (!(await roleOf(id, user.id))) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  await prisma.spaceObjective.deleteMany({ where: { id: oid, spaceId: id } });
  return NextResponse.json({ ok: true });
}
