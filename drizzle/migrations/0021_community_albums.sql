ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "isCommunity" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "albums_community_createdAt_idx" ON "albums" ("createdAt") WHERE "isCommunity" = true;
