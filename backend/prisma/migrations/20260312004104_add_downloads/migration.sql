-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DownloadFormat" AS ENUM ('mp4', 'mp3', 'webm', 'm4a');

-- CreateEnum
CREATE TYPE "DownloadQuality" AS ENUM ('q240p', 'q360p', 'q480p', 'q720p', 'q1080p');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreditTransactionReason" ADD VALUE 'DOWNLOAD_USED';
ALTER TYPE "CreditTransactionReason" ADD VALUE 'DOWNLOAD_REFUND';

-- CreateTable
CREATE TABLE "downloads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "title" TEXT,
    "thumbnail" TEXT,
    "format" "DownloadFormat" NOT NULL DEFAULT 'mp4',
    "quality" "DownloadQuality" NOT NULL DEFAULT 'q360p',
    "downloadUrl" TEXT,
    "fileSize" TEXT,
    "duration" TEXT,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
