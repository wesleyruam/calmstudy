import { NextResponse } from "next/server";
import { currentUser } from "@/lib/study";
import { sseResponse } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE da camada da comunidade de um livro: empurra contribuições que ficam
// públicas/deixam de ser. Só contribuições PÚBLICAS chegam neste canal.
export async function GET(req: Request) {
  const bookId = new URL(req.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "bookId obrigatório." }, { status: 400 });
  try {
    await currentUser();
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  return sseResponse(`book:${bookId}`, req.signal);
}
