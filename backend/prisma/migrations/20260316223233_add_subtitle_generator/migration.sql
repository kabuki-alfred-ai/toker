-- CreateEnum
CREATE TYPE "SubtitleGenerationStatus" AS ENUM ('PENDING', 'TRANSCRIBING', 'RENDERING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubtitlePreset" AS ENUM ('BOLD_SHADOW', 'KARAOKE', 'PILL', 'OUTLINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionReason" ADD VALUE 'SUBTITLE_GENERATION_USED';
ALTER TYPE "CreditTransactionReason" ADD VALUE 'SUBTITLE_GENERATION_REFUND';

-- CreateTable
CREATE TABLE "subtitle_generations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "preset" "SubtitlePreset" NOT NULL DEFAULT 'KARAOKE',
    "customization" JSONB,
    "wordSegments" JSONB,
    "status" "SubtitleGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtitle_generations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subtitle_generations" ADD CONSTRAINT "subtitle_generations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
