-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "conceptId" TEXT;

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "contentText" TEXT,
    "color" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptLink" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "ConceptLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptBook" (
    "conceptId" TEXT NOT NULL,
    "userBookId" TEXT NOT NULL,

    CONSTRAINT "ConceptBook_pkey" PRIMARY KEY ("conceptId","userBookId")
);

-- CreateTable
CREATE TABLE "ConceptHighlight" (
    "conceptId" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,

    CONSTRAINT "ConceptHighlight_pkey" PRIMARY KEY ("conceptId","highlightId")
);

-- CreateTable
CREATE TABLE "ConceptTag" (
    "conceptId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ConceptTag_pkey" PRIMARY KEY ("conceptId","tagId")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "userBookId" TEXT NOT NULL,
    "chapter" TEXT,
    "title" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "contentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Concept_userId_idx" ON "Concept"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_userId_title_key" ON "Concept"("userId", "title");

-- CreateIndex
CREATE INDEX "ConceptLink_toId_idx" ON "ConceptLink"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptLink_fromId_toId_key" ON "ConceptLink"("fromId", "toId");

-- CreateIndex
CREATE INDEX "Summary_userBookId_idx" ON "Summary"("userBookId");

-- CreateIndex
CREATE INDEX "Note_conceptId_idx" ON "Note"("conceptId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptLink" ADD CONSTRAINT "ConceptLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptLink" ADD CONSTRAINT "ConceptLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptBook" ADD CONSTRAINT "ConceptBook_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptBook" ADD CONSTRAINT "ConceptBook_userBookId_fkey" FOREIGN KEY ("userBookId") REFERENCES "UserBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptHighlight" ADD CONSTRAINT "ConceptHighlight_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptHighlight" ADD CONSTRAINT "ConceptHighlight_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "Highlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptTag" ADD CONSTRAINT "ConceptTag_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptTag" ADD CONSTRAINT "ConceptTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_userBookId_fkey" FOREIGN KEY ("userBookId") REFERENCES "UserBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
