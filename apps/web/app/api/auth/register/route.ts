import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@calmstudy/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Dados inválidos (senha mín. 8 caracteres)." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Conta sem senha (ex.: usuário padrão migrado) pode ser reivindicada —
    // preserva a biblioteca/anotações já existentes.
    if (existing.passwordHash)
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: parsed.data.name ?? existing.name },
    });
    return NextResponse.json({ ok: true, claimed: true });
  }

  await prisma.user.create({ data: { email, name: parsed.data.name ?? null, passwordHash } });
  return NextResponse.json({ ok: true });
}
