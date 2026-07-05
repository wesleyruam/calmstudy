import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().max(20).optional(),
  icon: z.string().max(8).optional(),
});

// Cria uma prateleira do usuário.
export async function POST(req: Request) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome inválido." }, { status: 400 });
  }
  const user = await currentUser();
  const shelf = await prisma.shelf.create({
    data: { userId: user.id, ...parsed.data },
  });
  return NextResponse.json({ id: shelf.id, name: shelf.name }, { status: 201 });
}
