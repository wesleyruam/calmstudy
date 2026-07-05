-- CreateTable
CREATE TABLE "ContributionReport" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContributionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContributionReport_contributionId_idx" ON "ContributionReport"("contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ContributionReport_contributionId_reporterId_key" ON "ContributionReport"("contributionId", "reporterId");

-- CreateIndex
CREATE INDEX "Contribution_bookId_page_visibility_idx" ON "Contribution"("bookId", "page", "visibility");

-- AddForeignKey
ALTER TABLE "ContributionReport" ADD CONSTRAINT "ContributionReport_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
