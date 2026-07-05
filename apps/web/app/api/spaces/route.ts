import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/study";
import { createSpace } from "@/lib/spaces";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  bookId: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const user = await currentUser();
  const id = await createSpace(user.id, parsed.data);
  if (!id) return NextResponse.json({ error: "Você não tem acesso a este livro." }, { status: 403 });
  return NextResponse.json({ id }, { status: 201 });
}
