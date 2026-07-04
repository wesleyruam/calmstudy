-- CreateEnum
CREATE TYPE "NoteKind" AS ENUM ('NOTE', 'QUESTION');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "kind" "NoteKind" NOT NULL DEFAULT 'NOTE';
