import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser, ownedUserBook } from "@/lib/study";
import { serializePageLink } from "@/lib/page-link-shared";

export const runtime = "nodejs";

const CreateSchema = z.object({
  fromPage: z.number().int().min(1),
  toPage: z.number().int().min(1),
  label: z.string().trim().min(1).max(200),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const links = await prisma.pageLink.findMany({
    where: { userBookId: id },
    orderBy: [{ fromPage: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ links: links.map(serializePageLink) });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  const user = await currentUser();
  if (!(await ownedUserBook(id, user.id)))
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const link = await prisma.pageLink.create({
    data: { userBookId: id, ...parsed.data },
  });
  return NextResponse.json({ link: serializePageLink(link) }, { status: 201 });
}
