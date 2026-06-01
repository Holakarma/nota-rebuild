-- Preserve possible direct ChatMessage -> Note values before removing the duplicate relation.
INSERT INTO "message_results" ("message_id", "note_id", "created_at")
SELECT
    "chat_message"."id",
    "chat_message"."noteId",
    "chat_message"."created_at"
FROM "chat_messages" AS "chat_message"
WHERE "chat_message"."noteId" IS NOT NULL
ON CONFLICT ("message_id") DO UPDATE
SET "note_id" = COALESCE("message_results"."note_id", EXCLUDED."note_id");

-- Preserve possible stream result values derived from the direct ChatMessage -> Note relation.
INSERT INTO "message_result_streams" ("message_id", "stream_id", "created_at")
SELECT
    "chat_message"."id",
    "note_stream"."stream_id",
    "note_stream"."created_at"
FROM "chat_messages" AS "chat_message"
JOIN "note_streams" AS "note_stream"
    ON "note_stream"."note_id" = "chat_message"."noteId"
WHERE "chat_message"."noteId" IS NOT NULL
ON CONFLICT ("message_id", "stream_id") DO NOTHING;

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_noteId_fkey";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "noteId";

-- DropIndex
DROP INDEX IF EXISTS "note_streams_note_id_stream_id_idx";
