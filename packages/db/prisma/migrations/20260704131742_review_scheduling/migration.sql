-- Repetição espaçada (E5, módulo 24): agenda de revisão no Highlight.
ALTER TABLE "Highlight"
  ADD COLUMN "reviewCount"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
  ADD COLUMN "nextReviewAt"   TIMESTAMP(3);

-- ── Busca: de colunas GERADAS para mantidas por TRIGGER ──
-- O Prisma não consegue representar colunas geradas (`GENERATED ALWAYS AS`),
-- então cada migration futura tentava alterá-las (drift). Convertemos para
-- coluna tsvector comum + trigger: idêntico p/ o Prisma (Unsupported tsvector),
-- sem drift. DROP EXPRESSION mantém os valores já calculados.
ALTER TABLE "Book"      ALTER COLUMN "search_tsv" DROP EXPRESSION;
ALTER TABLE "Concept"   ALTER COLUMN "search_tsv" DROP EXPRESSION;
ALTER TABLE "Highlight" ALTER COLUMN "search_tsv" DROP EXPRESSION;
ALTER TABLE "Note"      ALTER COLUMN "search_tsv" DROP EXPRESSION;
ALTER TABLE "Summary"   ALTER COLUMN "search_tsv" DROP EXPRESSION;

CREATE OR REPLACE FUNCTION calmstudy_book_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."author", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."textContent", '')), 'D');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calmstudy_concept_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."description", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."contentText", '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calmstudy_highlight_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW."text", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."observation", '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calmstudy_note_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."contentText", '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calmstudy_summary_tsv() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."chapter", '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW."contentText", '')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER calmstudy_book_tsv_trg      BEFORE INSERT OR UPDATE ON "Book"      FOR EACH ROW EXECUTE FUNCTION calmstudy_book_tsv();
CREATE TRIGGER calmstudy_concept_tsv_trg   BEFORE INSERT OR UPDATE ON "Concept"   FOR EACH ROW EXECUTE FUNCTION calmstudy_concept_tsv();
CREATE TRIGGER calmstudy_highlight_tsv_trg BEFORE INSERT OR UPDATE ON "Highlight" FOR EACH ROW EXECUTE FUNCTION calmstudy_highlight_tsv();
CREATE TRIGGER calmstudy_note_tsv_trg      BEFORE INSERT OR UPDATE ON "Note"      FOR EACH ROW EXECUTE FUNCTION calmstudy_note_tsv();
CREATE TRIGGER calmstudy_summary_tsv_trg   BEFORE INSERT OR UPDATE ON "Summary"   FOR EACH ROW EXECUTE FUNCTION calmstudy_summary_tsv();
