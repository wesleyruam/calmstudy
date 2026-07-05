import "server-only";
import { prisma } from "@calmstudy/db";
import { currentUser } from "./study";

// Busca global (E5, módulo 18). FTS Postgres sobre colunas `search_tsv` geradas
// (ver migration search_fts). Consulta direta via $queryRaw — mesmo padrão de
// leitura de library.ts/review.ts (Prisma direto em web/lib, sem passar pela porta core).

export type SearchType = "book" | "highlight" | "note" | "concept" | "summary";

export interface SearchHit {
  type: SearchType;
  id: string;
  title: string;
  snippet: string | null;
  context: string | null; // subtítulo (livro de origem, autor, capítulo…)
  href: string;
  score: number;
}

export interface SearchGroup {
  type: SearchType;
  label: string;
  hits: SearchHit[];
}

export interface SearchResults {
  query: string;
  total: number;
  groups: SearchGroup[];
}

const GROUP_LABELS: Record<SearchType, string> = {
  book: "Livros",
  highlight: "Destaques",
  note: "Notas",
  concept: "Conceitos",
  summary: "Resumos",
};

const PER_TYPE = 8;

// Monta um tsquery de prefixo (busca-enquanto-digita): cada termo vira `termo:*`
// unidos por AND. Sanitiza para conter só letras/dígitos, evitando erro de sintaxe
// e injeção (ainda assim passado como parâmetro vinculado ao to_tsquery).
function toPrefixTsQuery(raw: string): string | null {
  const tokens = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

function cleanSnippet(s: unknown): string | null {
  if (typeof s !== "string" || !s.trim()) return null;
  // ts_headline envolve os matches em <b>…</b>; removemos (render é texto puro).
  return s.replace(/<\/?b>/g, "").trim() || null;
}

function truncate(s: string, n = 90): string {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

const HEADLINE_OPTS = "StartSel=<b>,StopSel=</b>,MaxFragments=1,MaxWords=20,MinWords=6,ShortWord=2";

export async function searchAll(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim();
  const tsq = toPrefixTsQuery(query);
  if (!tsq) return { query, total: 0, groups: [] };

  const user = await currentUser();
  const uid = user.id;

  type Row = Record<string, unknown>;
  const q = (sql: string) => prisma.$queryRawUnsafe<Row[]>(sql, tsq, uid);

  const [books, highlights, notes, concepts, summaries] = await Promise.all([
    q(`
      SELECT ub.id AS ub_id, b.title, b.author,
             ts_rank(b.search_tsv, query) AS score,
             ts_headline('portuguese', coalesce(b."textContent", ''), query, '${HEADLINE_OPTS}') AS snippet
      FROM "Book" b
      JOIN "UserBook" ub ON ub."bookId" = b.id AND ub."userId" = $2 AND ub."deletedAt" IS NULL,
           to_tsquery('portuguese', $1) query
      WHERE b.search_tsv @@ query
      ORDER BY score DESC
      LIMIT ${PER_TYPE}
    `),
    q(`
      SELECT h.id, h.text, h.page, h."userBookId" AS ub_id, b.title AS book_title,
             ts_rank(h.search_tsv, query) AS score
      FROM "Highlight" h
      JOIN "UserBook" ub ON ub.id = h."userBookId" AND ub."userId" = $2 AND ub."deletedAt" IS NULL
      JOIN "Book" b ON b.id = ub."bookId",
           to_tsquery('portuguese', $1) query
      WHERE h.search_tsv @@ query
      ORDER BY score DESC
      LIMIT ${PER_TYPE}
    `),
    q(`
      SELECT n.id, n.title, n."userBookId" AS ub_id, n."conceptId", n."isFreePage",
             ts_rank(n.search_tsv, query) AS score,
             ts_headline('portuguese', coalesce(n."contentText", ''), query, '${HEADLINE_OPTS}') AS snippet
      FROM "Note" n, to_tsquery('portuguese', $1) query
      WHERE n."userId" = $2 AND n.search_tsv @@ query
      ORDER BY score DESC
      LIMIT ${PER_TYPE}
    `),
    q(`
      SELECT c.id, c.title, c.description,
             ts_rank(c.search_tsv, query) AS score,
             ts_headline('portuguese', coalesce(c."contentText", ''), query, '${HEADLINE_OPTS}') AS snippet
      FROM "Concept" c, to_tsquery('portuguese', $1) query
      WHERE c."userId" = $2 AND c.search_tsv @@ query
      ORDER BY score DESC
      LIMIT ${PER_TYPE}
    `),
    q(`
      SELECT s.id, s.title, s.chapter, s."userBookId" AS ub_id, b.title AS book_title,
             ts_rank(s.search_tsv, query) AS score,
             ts_headline('portuguese', coalesce(s."contentText", ''), query, '${HEADLINE_OPTS}') AS snippet
      FROM "Summary" s
      JOIN "UserBook" ub ON ub.id = s."userBookId" AND ub."userId" = $2 AND ub."deletedAt" IS NULL
      JOIN "Book" b ON b.id = ub."bookId",
           to_tsquery('portuguese', $1) query
      WHERE s.search_tsv @@ query
      ORDER BY score DESC
      LIMIT ${PER_TYPE}
    `),
  ]);

  const groups: SearchGroup[] = [];

  const bookHits: SearchHit[] = books.map((r) => ({
    type: "book",
    id: String(r.ub_id),
    title: String(r.title),
    snippet: cleanSnippet(r.snippet),
    context: (r.author as string) || null,
    href: `/read/${r.ub_id}`,
    score: Number(r.score),
  }));

  const highlightHits: SearchHit[] = highlights.map((r) => ({
    type: "highlight",
    id: String(r.id),
    title: truncate(String(r.text)),
    snippet: null,
    context: [r.book_title, r.page ? `p. ${r.page}` : null].filter(Boolean).join(" · ") || null,
    href: `/caderno/${r.ub_id}`,
    score: Number(r.score),
  }));

  const noteHits: SearchHit[] = notes.map((r) => ({
    type: "note",
    id: String(r.id),
    title: (r.title as string) || cleanSnippet(r.snippet)?.slice(0, 40) || "Nota sem título",
    snippet: cleanSnippet(r.snippet),
    context: r.isFreePage ? "Página livre" : r.conceptId ? "Conceito" : "Livro",
    href: r.isFreePage
      ? `/pagina/${r.id}`
      : r.conceptId
        ? `/conceito/${r.conceptId}`
        : `/caderno/${r.ub_id}`,
    score: Number(r.score),
  }));

  const conceptHits: SearchHit[] = concepts.map((r) => ({
    type: "concept",
    id: String(r.id),
    title: String(r.title),
    snippet: (r.description as string) || cleanSnippet(r.snippet),
    context: null,
    href: `/conceito/${r.id}`,
    score: Number(r.score),
  }));

  const summaryHits: SearchHit[] = summaries.map((r) => ({
    type: "summary",
    id: String(r.id),
    title: (r.title as string) || (r.chapter as string) || "Resumo sem título",
    snippet: cleanSnippet(r.snippet),
    context: [r.book_title, r.chapter].filter(Boolean).join(" · ") || null,
    href: `/caderno/${r.ub_id}`,
    score: Number(r.score),
  }));

  for (const [type, hits] of [
    ["book", bookHits],
    ["highlight", highlightHits],
    ["note", noteHits],
    ["concept", conceptHits],
    ["summary", summaryHits],
  ] as const) {
    if (hits.length) groups.push({ type, label: GROUP_LABELS[type], hits });
  }

  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  return { query, total, groups };
}
