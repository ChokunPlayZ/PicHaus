-- Ensure all Prisma-created uuid primary key columns have gen_random_uuid() as
-- their database-level default. The 0000 migration was stamped-not-run on
-- existing Prisma installs, so these tables were created by Prisma which may
-- not have set a DB-level DEFAULT. Drizzle generates INSERT ... VALUES (DEFAULT, ...)
-- which returns NULL when no default is defined, causing not-null violations.
-- All statements are idempotent: setting DEFAULT when one already exists is safe.
ALTER TABLE "users"               ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "albums"              ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "photos"              ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "passkeys"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "share_groups"        ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "share_links"         ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "album_collaborators" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "api_tokens"          ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
