-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Book_contentHash_idx" ON "Book"("contentHash");
