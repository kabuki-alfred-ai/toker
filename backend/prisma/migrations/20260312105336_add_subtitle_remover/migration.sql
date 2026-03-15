-- CreateEnum
CREATE TYPE "SubtitleRemovalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionReason" ADD VALUE 'SUBTITLE_REMOVAL_USED';
ALTER TYPE "CreditTransactionReason" ADD VALUE 'SUBTITLE_REMOVAL_REFUND';

-- CreateTable
CREATE TABLE "subtitle_removals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "outputUrl" TEXT,
    "status" "SubtitleRemovalStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtitle_removals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "subtitle_removals" ADD CONSTRAINT "subtitle_removals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
