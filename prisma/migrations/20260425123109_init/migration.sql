-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('PASSWORD', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "note_source_type" AS ENUM ('WEB', 'TELEGRAM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "login" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "auth_provider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "provider_username" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "preview_text" TEXT NOT NULL,
    "search_vector" tsvector,
    "source_type" "note_source_type" NOT NULL,
    "source_meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_streams" (
    "note_id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_streams_pkey" PRIMARY KEY ("note_id","stream_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE INDEX "auth_identities_user_id_idx" ON "auth_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_provider_user_id_uq" ON "auth_identities"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_user_id_provider_uq" ON "auth_identities"("user_id", "provider");

-- CreateIndex
CREATE INDEX "streams_user_id_idx" ON "streams"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "streams_user_id_normalized_name_uq" ON "streams"("user_id", "normalized_name");

-- CreateIndex
CREATE INDEX "notes_user_id_updated_at_idx" ON "notes"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "note_streams_stream_id_note_id_idx" ON "note_streams"("stream_id", "note_id");

-- CreateIndex
CREATE INDEX "note_streams_note_id_stream_id_idx" ON "note_streams"("note_id", "stream_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_uq" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_tokens_token_hash_uq" ON "telegram_link_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_user_id_idx" ON "telegram_link_tokens"("user_id");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_expires_at_idx" ON "telegram_link_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_user_id_used_at_idx" ON "telegram_link_tokens"("user_id", "used_at");

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_streams" ADD CONSTRAINT "note_streams_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_streams" ADD CONSTRAINT "note_streams_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RAW SQL MIGRATE

-- Enable trigram operator classes for fuzzy and substring search.
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enforce case-insensitive login uniqueness.
CREATE UNIQUE INDEX "users_login_lower_uq" ON "users" (lower("login"));

-- Build a multilingual search vector for mixed Russian/English notes.
CREATE OR REPLACE FUNCTION "notes_search_vector_build"("body_text" text)
RETURNS tsvector AS $$
    SELECT
        setweight(to_tsvector('pg_catalog.russian', coalesce($1, '')), 'A') ||
        setweight(to_tsvector('pg_catalog.english', coalesce($1, '')), 'A') ||
        setweight(to_tsvector('pg_catalog.simple', coalesce($1, '')), 'D');
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Keep notes.search_vector in sync with body_text.
CREATE OR REPLACE FUNCTION "notes_search_vector_sync"()
RETURNS trigger AS $$
BEGIN
    NEW."search_vector" := "notes_search_vector_build"(NEW."body_text");
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

UPDATE "notes"
SET "search_vector" = "notes_search_vector_build"("body_text");

CREATE TRIGGER "notes_search_vector_sync_trg"
BEFORE INSERT OR UPDATE OF "body_text"
ON "notes"
FOR EACH ROW
EXECUTE FUNCTION "notes_search_vector_sync"();

-- Replace Prisma's plain list index with the raw partial index used by active notes.
DROP INDEX "notes_user_id_updated_at_idx";

CREATE INDEX "notes_user_id_updated_at_idx"
ON "notes" ("user_id", "updated_at" DESC)
WHERE "deleted_at" IS NULL;

CREATE INDEX "notes_search_vector_gin_idx"
ON "notes" USING GIN ("search_vector")
WHERE "deleted_at" IS NULL;

CREATE INDEX "notes_body_text_trgm_idx"
ON "notes" USING GIN ("body_text" gin_trgm_ops)
WHERE "deleted_at" IS NULL;
