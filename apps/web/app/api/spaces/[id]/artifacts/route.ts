import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { createArtifact, listArtifacts } from "@/lib/artifacts";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const artifacts = await listArtifacts(id, user.id);
  if (artifacts === null) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ artifacts });
}

const CreateSchema = z.object({
  type: z.enum(["SUMMARY", "GLOSSARY", "CONCEPT", "REFERENCE", "EXERCISE"]),
  title: z.string().trim().min(1).max(200),
  contentText: z.string().trim().min(1).max(20000),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  const ok = await createArtifact(user.id, { spaceId: id, ...parsed.data });
  if (!ok) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
