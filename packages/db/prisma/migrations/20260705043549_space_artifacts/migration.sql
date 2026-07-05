-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('SUMMARY', 'GLOSSARY', 'CONCEPT', 'REFERENCE', 'EXERCISE');

-- CreateTable
CREATE TABLE "SpaceArtifact" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "type" "ArtifactType" NOT NULL,
    "title" TEXT NOT NULL,
    "anchor" JSONB,
    "content" JSONB NOT NULL,
    "contentText" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArtifactRevision" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArtifactRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceArtifact_spaceId_type_idx" ON "SpaceArtifact"("spaceId", "type");

-- CreateIndex
CREATE INDEX "ArtifactRevision_artifactId_idx" ON "ArtifactRevision"("artifactId");

-- AddForeignKey
ALTER TABLE "SpaceArtifact" ADD CONSTRAINT "SpaceArtifact_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "StudySpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtifactRevision" ADD CONSTRAINT "ArtifactRevision_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "SpaceArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
