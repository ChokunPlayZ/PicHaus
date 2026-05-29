-- PicHaus initial schema
-- Uses IF NOT EXISTS throughout so this is safe to run on both
-- fresh databases and databases that were previously managed by Prisma.

-- Enum -----------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Core tables ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "users" (
    "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
    "email"        TEXT,
    "passwordHash" TEXT,
    "name"         TEXT,
    "instagram"    TEXT,
    "createdAt"    BIGINT  NOT NULL,
    "updatedAt"    BIGINT  NOT NULL,
    "role"         "Role"  NOT NULL DEFAULT 'USER',
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

CREATE TABLE IF NOT EXISTS "albums" (
    "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
    "title"        TEXT    NOT NULL,
    "description"  TEXT,
    "tags"         TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    "eventDate"    BIGINT,
    "isPublic"     BOOLEAN NOT NULL DEFAULT false,
    "createdAt"    BIGINT  NOT NULL,
    "updatedAt"    BIGINT  NOT NULL,
    "ownerId"      UUID    NOT NULL,
    "coverPhotoId" UUID,
    CONSTRAINT "albums_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "albums_ownerId_fkey" FOREIGN KEY ("ownerId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "photos" (
    "id"                   UUID    NOT NULL DEFAULT gen_random_uuid(),
    "filename"             TEXT    NOT NULL,
    "originalName"         TEXT    NOT NULL,
    "storagePath"          TEXT    NOT NULL,
    "thumbnailStoragePath" TEXT    NOT NULL,
    "blurhash"             TEXT    NOT NULL,
    "size"                 INTEGER NOT NULL,
    "width"                INTEGER NOT NULL,
    "height"               INTEGER NOT NULL,
    "mimeType"             TEXT    NOT NULL,
    "fileHash"             TEXT    NOT NULL,
    "cameraModel"          TEXT,
    "lens"                 TEXT,
    "focalLength"          TEXT,
    "iso"                  INTEGER,
    "aperture"             TEXT,
    "shutterSpeed"         TEXT,
    "dateTaken"            BIGINT,
    "createdAt"            BIGINT  NOT NULL,
    "updatedAt"            BIGINT  NOT NULL,
    "albumId"              UUID    NOT NULL,
    "uploaderId"           UUID,
    CONSTRAINT "photos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "photos_albumId_fkey" FOREIGN KEY ("albumId")
        REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "photos_uploaderId_fkey" FOREIGN KEY ("uploaderId")
        REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "photos_albumId_idx"   ON "photos"("albumId");
CREATE INDEX IF NOT EXISTS "photos_uploaderId_idx" ON "photos"("uploaderId");
CREATE INDEX IF NOT EXISTS "photos_fileHash_idx"   ON "photos"("fileHash");

-- Add coverPhotoId FK now that photos exists (circular ref — conditional add)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'albums_coverPhotoId_fkey'
    ) THEN
        ALTER TABLE "albums"
            ADD CONSTRAINT "albums_coverPhotoId_fkey"
            FOREIGN KEY ("coverPhotoId") REFERENCES "photos"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "passkeys" (
    "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
    "credentialId" TEXT    NOT NULL,
    "publicKey"    TEXT    NOT NULL,
    "counter"      INTEGER NOT NULL DEFAULT 0,
    "transports"   TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deviceType"   TEXT    NOT NULL DEFAULT 'singleDevice',
    "backedUp"     BOOLEAN NOT NULL DEFAULT false,
    "name"         TEXT    NOT NULL DEFAULT 'Passkey',
    "createdAt"    BIGINT  NOT NULL,
    "lastUsedAt"   BIGINT,
    "userId"       UUID    NOT NULL,
    CONSTRAINT "passkeys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "passkeys_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "passkeys_credentialId_key" ON "passkeys"("credentialId");
CREATE INDEX        IF NOT EXISTS "passkeys_userId_idx"       ON "passkeys"("userId");

CREATE TABLE IF NOT EXISTS "share_groups" (
    "id"          UUID   NOT NULL DEFAULT gen_random_uuid(),
    "title"       TEXT   NOT NULL,
    "description" TEXT,
    "createdAt"   BIGINT NOT NULL,
    "updatedAt"   BIGINT NOT NULL,
    "ownerId"     UUID   NOT NULL,
    CONSTRAINT "share_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "share_groups_ownerId_fkey" FOREIGN KEY ("ownerId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "share_links" (
    "id"           UUID    NOT NULL DEFAULT gen_random_uuid(),
    "token"        TEXT    NOT NULL,
    "type"         TEXT    NOT NULL DEFAULT 'view',
    "password"     TEXT,
    "label"        TEXT,
    "views"        INTEGER NOT NULL DEFAULT 0,
    "createdAt"    BIGINT  NOT NULL,
    "expiresAt"    BIGINT,
    "showMetadata" BOOLEAN NOT NULL DEFAULT true,
    "albumId"      UUID,
    "shareGroupId" UUID,
    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "share_links_albumId_fkey" FOREIGN KEY ("albumId")
        REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "share_links_shareGroupId_fkey" FOREIGN KEY ("shareGroupId")
        REFERENCES "share_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "share_links_token_key" ON "share_links"("token");

CREATE TABLE IF NOT EXISTS "album_collaborators" (
    "id"        UUID   NOT NULL DEFAULT gen_random_uuid(),
    "role"      TEXT   NOT NULL DEFAULT 'viewer',
    "createdAt" BIGINT NOT NULL,
    "albumId"   UUID   NOT NULL,
    "userId"    UUID   NOT NULL,
    CONSTRAINT "album_collaborators_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "album_collaborators_albumId_fkey" FOREIGN KEY ("albumId")
        REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "album_collaborators_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "album_collaborators_albumId_userId_key"
    ON "album_collaborators"("albumId", "userId");

CREATE TABLE IF NOT EXISTS "api_tokens" (
    "id"          UUID   NOT NULL DEFAULT gen_random_uuid(),
    "name"        TEXT   NOT NULL,
    "token"       TEXT   NOT NULL,
    "tokenPrefix" TEXT   NOT NULL,
    "scopes"      TEXT[] NOT NULL,
    "lastUsedAt"  BIGINT,
    "expiresAt"   BIGINT,
    "createdAt"   BIGINT NOT NULL,
    "userId"      UUID   NOT NULL,
    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_tokens_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_token_key" ON "api_tokens"("token");

-- Album <-> ShareGroup many-to-many (Prisma implicit junction table)
CREATE TABLE IF NOT EXISTS "_AlbumToShareGroup" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,
    CONSTRAINT "_AlbumToShareGroup_pkey" PRIMARY KEY ("A", "B"),
    CONSTRAINT "_AlbumToShareGroup_A_fkey" FOREIGN KEY ("A")
        REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AlbumToShareGroup_B_fkey" FOREIGN KEY ("B")
        REFERENCES "share_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "_AlbumToShareGroup_B_index" ON "_AlbumToShareGroup"("B");
