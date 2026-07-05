import { NextResponse } from "next/server";
import { currentUser } from "@/lib/study";
import { getPublicPageContributions } from "@/lib/contributions";

export const runtime = "nodejs";

// Camada da comunidade: contribuições públicas por livro + página (qualquer usuário logado).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bookId = url.searchParams.get("bookId");
  const page = Number(url.searchParams.get("page"));
  if (!bookId || !Number.isInteger(page) || page < 1)
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  const user = await currentUser();
  const contributions = await getPublicPageContributions(bookId, user.id, page);
  return NextResponse.json({ contributions });
}
