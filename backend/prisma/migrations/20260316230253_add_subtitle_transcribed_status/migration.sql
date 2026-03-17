-- AlterEnum
ALTER TYPE "SubtitleGenerationStatus" ADD VALUE 'TRANSCRIBED';

-- AlterTable
ALTER TABLE "subtitle_generations" ADD COLUMN     "inputStorageKey" TEXT;
