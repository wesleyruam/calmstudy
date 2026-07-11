import { NextResponse } from "next/server";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";
import { sseResponse } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSE da discussão de um espaço: empurra novas contribuições/edições/remoções
// (por página) para os membros com o painel aberto. Escrever continua no POST.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId: string;
  try {
    userId = (await currentUser()).id;
  } catch {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId: id, userId } },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });

  return sseResponse(`space:${id}`, req.signal);
}
