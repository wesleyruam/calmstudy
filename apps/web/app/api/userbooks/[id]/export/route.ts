import { currentUser, ownedUserBook } from "@/lib/study";
import {
  buildBookExport,
  renderExport,
  exportFilename,
  type ExportFormat,
} from "@/lib/export";

export const runtime = "nodejs";

const FORMATS: ExportFormat[] = ["md", "html", "json"];

// Exporta o material de estudo de um livro (módulo 25).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format") ?? "md";
  if (!FORMATS.includes(fmt as ExportFormat)) {
    return Response.json({ error: "Formato inválido." }, { status: 400 });
  }
  const format = fmt as ExportFormat;

  const user = await currentUser();
  const owned = await ownedUserBook(id, user.id);
  if (!owned) return Response.json({ error: "Não encontrado." }, { status: 404 });

  const data = await buildBookExport(id);
  if (!data) return Response.json({ error: "Não encontrado." }, { status: 404 });

  const { body, contentType } = renderExport(data, format);
  const filename = exportFilename(data.title, format);

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
