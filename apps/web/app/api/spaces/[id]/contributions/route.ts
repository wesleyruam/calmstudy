import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { createContribution, listPageContributions } from "@/lib/contributions";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = Number(new URL(req.url).searchParams.get("page"));
  if (!Number.isInteger(page) || page < 1)
    return NextResponse.json({ error: "Página inválida." }, { status: 400 });
  const user = await currentUser();
  const contributions = await listPageContributions(id, user.id, page);
  if (contributions === null) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ contributions });
}

const CreateSchema = z.object({
  kind: z.enum(["QUESTION", "COMMENT", "ANSWER", "NOTE"]),
  page: z.number().int().min(1),
  quotedText: z.string().trim().max(2000).optional(),
  contentText: z.string().trim().min(1).max(5000),
  parentId: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const contribution = await createContribution(user.id, { spaceId: id, ...parsed.data });
  if (!contribution) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ contribution }, { status: 201 });
}
