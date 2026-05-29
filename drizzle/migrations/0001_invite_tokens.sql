-- Invite tokens: one-time links for new user registration and admin-generated password resets

CREATE TABLE IF NOT EXISTS "invite_tokens" (
    "id"        UUID   NOT NULL DEFAULT gen_random_uuid(),
    "token"     TEXT   NOT NULL,
    "type"      TEXT   NOT NULL,
    "userId"    UUID   REFERENCES "users"("id") ON DELETE CASCADE,
    "label"     TEXT,
    "usedAt"    BIGINT,
    "expiresAt" BIGINT NOT NULL,
    "createdAt" BIGINT NOT NULL,
    "createdBy" UUID   REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invite_tokens_token_key" ON "invite_tokens"("token");
