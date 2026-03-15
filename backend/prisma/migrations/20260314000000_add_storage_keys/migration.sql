-- Add storageKey to downloads (RustFS bucket path for persistent storage)
ALTER TABLE "downloads" ADD COLUMN "storageKey" TEXT;

-- Add storageKey to subtitle_removals
ALTER TABLE "subtitle_removals" ADD COLUMN "storageKey" TEXT;
