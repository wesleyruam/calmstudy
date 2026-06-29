import { NextResponse } from "next/server";
import { FilesystemStorage } from "@calmbook/infra";

export const runtime = "nodejs";

const storage = new FilesystemStorage();

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  html: "text/html; charset=utf-8",
};

// Serve o arquivo armazenado. Dev: lê do filesystem. Prod: redirect p/ URL S3 assinada.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key } = await params;
  const fileKey = key.map(decodeURIComponent).join("/");

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
