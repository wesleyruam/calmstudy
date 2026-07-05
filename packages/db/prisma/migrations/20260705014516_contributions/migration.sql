-- CreateEnum
CREATE TYPE "ContributionKind" AS ENUM ('QUESTION', 'COMMENT', 'ANSWER', 'NOTE');

-- CreateEnum
CREATE TYPE "ContributionAnchor" AS ENUM ('BOOK', 'CHAPTER', 'PAGE', 'RANGE', 'CONCEPT');

-- CreateEnum
CREATE TYPE "ContributionVisibility" AS ENUM ('SPACE', 'PUBLIC');

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "kind" "ContributionKind" NOT NULL,
    "anchorType" "ContributionAnchor" NOT NULL DEFAULT 'PAGE',
    "page" INTEGER,
    "quotedText" TEXT,
    "content" JSONB NOT NULL,
    "contentText" TEXT NOT NULL,
    "parentId" TEXT,
    "visibility" "ContributionVisibility" NOT NULL DEFAULT 'SPACE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contribution_spaceId_page_idx" ON "Contribution"("spaceId", "page");

-- CreateIndex
CREATE INDEX "Contribution_parentId_idx" ON "Contribution"("parentId");

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "StudySpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
