/*
  Warnings:

  - You are about to drop the column `comment` on the `Highlight` table. All the data in the column will be lost.
  - The `color` column on the `Highlight` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `color` on the `Note` table. All the data in the column will be lost.
  - The `content` column on the `Note` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `Highlight` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HighlightCategory" AS ENUM ('IMPORTANT', 'DEFINITION', 'EXAMPLE', 'QUESTION', 'REVIEW', 'EXERCISE', 'QUOTE', 'IDEA', 'APPLICATION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'REVIEWED', 'MASTERED');

-- AlterTable
ALTER TABLE "Highlight" DROP COLUMN "comment",
ADD COLUMN     "category" "HighlightCategory" NOT NULL DEFAULT 'IMPORTANT',
ADD COLUMN     "chapter" TEXT,
ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "observation" TEXT,
ADD COLUMN     "priority" "Priority",
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "color",
ADD COLUMN     "color" TEXT;

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "color",
ADD COLUMN     "contentText" TEXT,
ADD COLUMN     "favorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highlightId" TEXT,
ADD COLUMN     "isFreePage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "userBookId" DROP NOT NULL,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL DEFAULT '{}';

-- DropEnum
DROP TYPE "HighlightColor";

-- CreateTable
CREATE TABLE "HighlightTag" (
    "highlightId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "HighlightTag_pkey" PRIMARY KEY ("highlightId","tagId")
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "noteId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("noteId","tagId")
);

-- CreateIndex
CREATE INDEX "Highlight_userBookId_category_idx" ON "Highlight"("userBookId", "category");

-- CreateIndex
CREATE INDEX "Highlight_userBookId_reviewStatus_idx" ON "Highlight"("userBookId", "reviewStatus");

-- CreateIndex
CREATE INDEX "Note_userId_idx" ON "Note"("userId");

-- CreateIndex
CREATE INDEX "Note_highlightId_idx" ON "Note"("highlightId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "Highlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightTag" ADD CONSTRAINT "HighlightTag_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "Highlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightTag" ADD CONSTRAINT "HighlightTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
