import "server-only";
import { prisma } from "@calmstudy/db";
import { getOrCreateDefaultUser } from "@calmstudy/infra";
import { getNotebook } from "./notebook";
import { CATEGORY_META } from "./highlight-shared";

// Exportação (E5, módulo 25): reúne tudo que o usuário produziu num livro
// (destaques, notas, resumos, conceitos relacionados) em Markdown/HTML/JSON.

export type ExportFormat = "md" | "html" | "json";

export interface ExportConcept {
  id: string;
  title: string;
  description: string | null;
}

export interface BookExport {
  title: string;
  author: string | null;
  exportedAt: string;
  highlights: {
    page: number | null;
    category: string;
    categoryLabel: string;
    text: string;
    observation: string | null;
    tags: string[];
    notes: { title: string | null; text: string }[];
  }[];
  looseNotes: { title: string | null; text: string }[];
  summaries: { title: string | null; chapter: string | null; text: string }[];
  concepts: ExportConcept[];
}

export async function buildBookExport(userBookId: string): Promise<BookExport | null> {
  const nb = await getNotebook(userBookId);
  if (!nb) return null;

  const user = await getOrCreateDefaultUser();
  const concepts = await prisma.concept.findMany({
    where: { userId: user.id, books: { some: { userBookId } } },
    select: { id: true, title: true, description: true },
    orderBy: { title: "asc" },
  });

  return {
    title: nb.title,
    author: nb.author,
    exportedAt: new Date().toISOString(),
    highlights: nb.highlights.map((h) => ({
      page: h.page,
      category: h.category,
      categoryLabel: CATEGORY_META[h.category].label,
      text: h.text,
      observation: h.observation,
      tags: h.tags,
      notes: h.notes.map((n) => ({ title: n.title, text: (n.contentText ?? "").trim() })),
    })),
    looseNotes: nb.looseNotes.map((n) => ({ title: n.title, text: (n.contentText ?? "").trim() })),
    summaries: nb.summaries.map((s) => ({
      title: s.title,
      chapter: s.chapter,
      text: (s.contentText ?? "").trim(),
    })),
    concepts,
  };
}

// Nome de arquivo seguro a partir do título.
export function exportFilename(title: string, format: ExportFormat): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "livro";
  return `${slug}.${format}`;
}

// ─────────────────────────── Markdown ───────────────────────────

export function toMarkdown(e: BookExport): string {
  const out: string[] = [];
  out.push(`# ${e.title}`);
  if (e.author) out.push(`*${e.author}*`);
  out.push(`> Exportado do CalmStudy · ${formatDate(e.exportedAt)}`);
  out.push("");

  if (e.highlights.length) {
    out.push(`## Destaques (${e.highlights.length})`, "");
    for (const h of e.highlights) {
      const loc = [h.page != null ? `p. ${h.page}` : null, h.categoryLabel]
        .filter(Boolean)
        .join(" · ");
      out.push(`### ${loc}`);
      out.push(`> ${h.text.replace(/\n/g, "\n> ")}`);
      if (h.observation) out.push("", h.observation);
      if (h.tags.length) out.push("", h.tags.map((t) => `\`#${t}\``).join(" "));
      for (const n of h.notes) {
        if (!n.text) continue;
        out.push("", `**Nota${n.title ? ` — ${n.title}` : ""}:** ${n.text}`);
      }
      out.push("");
    }
  }

  if (e.summaries.length) {
    out.push(`## Resumos (${e.summaries.length})`, "");
    for (const s of e.summaries) {
      out.push(`### ${s.title || s.chapter || "Resumo"}`);
      if (s.chapter && s.title) out.push(`*${s.chapter}*`);
      if (s.text) out.push("", s.text);
      out.push("");
    }
  }

  if (e.looseNotes.length) {
    out.push(`## Notas soltas (${e.looseNotes.length})`, "");
    for (const n of e.looseNotes) {
      out.push(`### ${n.title || "Nota"}`);
      if (n.text) out.push("", n.text);
      out.push("");
    }
  }

  if (e.concepts.length) {
    out.push(`## Conceitos relacionados (${e.concepts.length})`, "");
    for (const c of e.concepts) {
      out.push(`- **${c.title}**${c.description ? ` — ${c.description}` : ""}`);
    }
    out.push("");
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ───────────────────────────── HTML ─────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function toHtml(e: BookExport): string {
  const parts: string[] = [];
  const section = (title: string, body: string) =>
    body ? `<section><h2>${esc(title)}</h2>${body}</section>` : "";

  const highlights = e.highlights
    .map((h) => {
      const loc = [h.page != null ? `p. ${h.page}` : null, h.categoryLabel]
        .filter(Boolean)
        .join(" · ");
      const tags = h.tags.length
        ? `<p class="tags">${h.tags.map((t) => `#${esc(t)}`).join(" ")}</p>`
        : "";
      const obs = h.observation ? `<p class="obs">${esc(h.observation)}</p>` : "";
      const notes = h.notes
        .filter((n) => n.text)
        .map((n) => `<p class="note"><strong>Nota${n.title ? ` — ${esc(n.title)}` : ""}:</strong> ${esc(n.text)}</p>`)
        .join("");
      return `<article><h3>${esc(loc)}</h3><blockquote>${esc(h.text)}</blockquote>${obs}${tags}${notes}</article>`;
    })
    .join("");

  const summaries = e.summaries
    .map(
      (s) =>
        `<article><h3>${esc(s.title || s.chapter || "Resumo")}</h3>${s.text ? `<p>${esc(s.text)}</p>` : ""}</article>`,
    )
    .join("");

  const looseNotes = e.looseNotes
    .map((n) => `<article><h3>${esc(n.title || "Nota")}</h3>${n.text ? `<p>${esc(n.text)}</p>` : ""}</article>`)
    .join("");

  const concepts = e.concepts.length
    ? `<ul>${e.concepts
        .map((c) => `<li><strong>${esc(c.title)}</strong>${c.description ? ` — ${esc(c.description)}` : ""}</li>`)
        .join("")}</ul>`
    : "";

  parts.push(
    section(`Destaques (${e.highlights.length})`, highlights),
    section(`Resumos (${e.summaries.length})`, summaries),
    section(`Notas soltas (${e.looseNotes.length})`, looseNotes),
    section(`Conceitos relacionados (${e.concepts.length})`, concepts),
  );

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(e.title)}</title>
<style>
  body { font: 16px/1.6 -apple-system, system-ui, sans-serif; max-width: 720px; margin: 3rem auto; padding: 0 1.25rem; color: #1c1b1a; }
  h1 { font-size: 1.9rem; margin-bottom: .2rem; }
  .author { color: #6b6b6b; font-style: italic; margin-top: 0; }
  .meta { color: #9a9a9a; font-size: .85rem; }
  h2 { margin-top: 2.5rem; font-size: 1.15rem; border-bottom: 1px solid #eee; padding-bottom: .3rem; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #8a8a8a; margin: 1.5rem 0 .4rem; }
  blockquote { margin: 0; padding-left: 1rem; border-left: 3px solid #d9c56a; }
  .obs { color: #555; }
  .tags { color: #8a8a8a; font-size: .85rem; }
  .note { background: #f6f6f4; padding: .5rem .75rem; border-radius: .5rem; }
</style></head><body>
<h1>${esc(e.title)}</h1>
${e.author ? `<p class="author">${esc(e.author)}</p>` : ""}
<p class="meta">Exportado do CalmStudy · ${esc(formatDate(e.exportedAt))}</p>
${parts.join("\n")}
</body></html>
`;
}

// ───────────────────────────── JSON ─────────────────────────────

export function toJson(e: BookExport): string {
  return JSON.stringify(e, null, 2);
}

export function renderExport(e: BookExport, format: ExportFormat): { body: string; contentType: string } {
  switch (format) {
    case "md":
      return { body: toMarkdown(e), contentType: "text/markdown; charset=utf-8" };
    case "html":
      return { body: toHtml(e), contentType: "text/html; charset=utf-8" };
    case "json":
      return { body: toJson(e), contentType: "application/json; charset=utf-8" };
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
