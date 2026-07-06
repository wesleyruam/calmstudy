import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { FilesystemStorage } from "@calmstudy/infra";
import { prisma } from "@calmstudy/db";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

const storage = new FilesystemStorage();

// Node ReadStream → Web ReadableStream para o corpo da resposta.
function toWeb(stream: Readable): ReadableStream {
  return Readable.toWeb(stream) as unknown as ReadableStream;
}

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

// Serve o arquivo armazenado com suporte a HTTP Range (206) e streaming — assim
// o pdf.js carrega só os bytes da página visível, em vez de baixar o PDF inteiro
// antes de renderizar. Dev: lê do filesystem. Prod: redirect p/ URL S3 assinada.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const fileKey = key.map(decodeURIComponent).join("/");

  const user = await currentUser();
  if (!(await userCanAccess(user.id, fileKey))) {
    return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  }

  let size: number;
  try {
    size = await storage.size(fileKey);
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const ext = fileKey.split(".").pop()?.toLowerCase() ?? "";
  const baseHeaders: Record<string, string> = {
    "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  const rangeHeader = req.headers.get("range");
  const match = rangeHeader ? /bytes=(\d*)-(\d*)/.exec(rangeHeader) : null;
  if (match) {
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : size - 1;
    if (Number.isNaN(start) || start < 0) start = 0;
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start > end || start >= size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
      });
    }
    return new NextResponse(toWeb(storage.readStream(fileKey, { start, end })), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(toWeb(storage.readStream(fileKey)), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
