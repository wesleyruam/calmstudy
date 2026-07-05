-- CreateTable
CREATE TABLE "PageLink" (
    "id" TEXT NOT NULL,
    "userBookId" TEXT NOT NULL,
    "fromPage" INTEGER NOT NULL,
    "toPage" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageLink_userBookId_fromPage_idx" ON "PageLink"("userBookId", "fromPage");

-- AddForeignKey
ALTER TABLE "PageLink" ADD CONSTRAINT "PageLink_userBookId_fkey" FOREIGN KEY ("userBookId") REFERENCES "UserBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
