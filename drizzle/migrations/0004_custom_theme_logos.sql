CREATE TABLE IF NOT EXISTS "logos" (
    "id"           UUID   NOT NULL DEFAULT gen_random_uuid(),
    "storagePath"  TEXT   NOT NULL,
    "originalName" TEXT   NOT NULL,
    "mimeType"     TEXT   NOT NULL,
    "uploadedById" UUID   REFERENCES "users"("id") ON DELETE SET NULL,
    "uploadedAt"   BIGINT NOT NULL,
    CONSTRAINT "logos_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "customTheme" TEXT;
ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "logoImageId" UUID REFERENCES "logos"("id") ON DELETE SET NULL;
