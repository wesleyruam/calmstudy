-- Busca global (E5): colunas tsvector GERADAS (STORED), mantidas pelo Postgres.
-- Config 'portuguese' + setweight (A=título > B > C=corpo) para ranquear melhor.

-- Book: título (A) > autor (B) > texto extraído (D)
ALTER TABLE "Book" ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce("author", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce("textContent", '')), 'D')
  ) STORED;

-- Concept: título (A) > definição (B) > corpo (C)
ALTER TABLE "Concept" ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce("contentText", '')), 'C')
  ) STORED;

-- Highlight: trecho (B) > observação (C)
ALTER TABLE "Highlight" ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("text", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce("observation", '')), 'C')
  ) STORED;

-- Note: título (A) > corpo (C)
ALTER TABLE "Note" ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce("contentText", '')), 'C')
  ) STORED;

-- Summary: título (A) > capítulo (B) > corpo (C)
ALTER TABLE "Summary" ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce("chapter", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce("contentText", '')), 'C')
  ) STORED;

-- CreateIndex
CREATE INDEX "Book_search_tsv_idx" ON "Book" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "Concept_search_tsv_idx" ON "Concept" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "Highlight_search_tsv_idx" ON "Highlight" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "Note_search_tsv_idx" ON "Note" USING GIN ("search_tsv");

-- CreateIndex
CREATE INDEX "Summary_search_tsv_idx" ON "Summary" USING GIN ("search_tsv");
