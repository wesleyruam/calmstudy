import { NextResponse } from "next/server";
import { ingestUpload, formatFromFilename } from "@calmstudy/infra";
import { currentUser } from "@/lib/study";

export const runtime = "nodejs";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

// Upload de documento(s). Grava, cria Book PROCESSING e enfileira — responde na hora.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Esperado multipart/form-data." }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const user = await currentUser();
  const created: { id: string; title: string }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    const format = formatFromFilename(file.name);
    if (!format) {
      rejected.push({ name: file.name, reason: "Formato não suportado." });
      continue;
    }
    if (file.size > MAX_BYTES) {
      rejected.push({ name: file.name, reason: "Arquivo grande demais (máx. 200 MB)." });
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const book = await ingestUpload({ userId: user.id, filename: file.name, format, bytes });
    created.push({ id: book.id, title: book.title });
  }

  return NextResponse.json({ created, rejected }, { status: created.length ? 201 : 400 });
}
