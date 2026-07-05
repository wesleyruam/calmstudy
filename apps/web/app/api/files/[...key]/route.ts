import { NextResponse } from "next/server";
import { FilesystemStorage } from "@calmstudy/infra";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

const storage = new FilesystemStorage();

// Só serve o arquivo se o usuário tem acesso ao Book correspondente — pelo
// arquivo em si (books/…) ou pela capa (covers/…, referenciada em coverUrl).
async function userCanAccess(userId: string, fileKey: string): Promise<boolean> {
  const book = await prisma.book.findFirst({
    where: {
      userBooks: { some: { userId, deletedAt: null } },
      OR: [{ fileKey }, { coverUrl: `/api/files/${fileKey}` }],
    },
    select: { id: true },
  });
  return !!book;
}

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  html: "text/html; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

// Serve o arquivo armazenado. Dev: lê do filesystem. Prod: redirect p/ URL S3 assinada.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const fileKey = key.map(decodeURIComponent).join("/");

  const user = await currentUser();
  if (!(await userCanAccess(user.id, fileKey))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  try {
    const bytes = await storage.get(fileKey);
    const ext = fileKey.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
