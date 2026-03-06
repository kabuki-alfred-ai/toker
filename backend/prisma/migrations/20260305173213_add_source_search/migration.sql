-- CreateEnum
CREATE TYPE "SourceSearchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionReason" ADD VALUE 'SOURCE_FINDER_USED';
ALTER TYPE "CreditTransactionReason" ADD VALUE 'SOURCE_FINDER_REFUND';

-- CreateTable
CREATE TABLE "source_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "status" "SourceSearchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_searches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "source_searches" ADD CONSTRAINT "source_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
