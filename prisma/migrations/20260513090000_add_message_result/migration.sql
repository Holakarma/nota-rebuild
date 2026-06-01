-- CreateTable
CREATE TABLE "message_results" (
    "message_id" UUID NOT NULL,
    "note_id" UUID,
    "stream_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_results_pkey" PRIMARY KEY ("message_id")
);

-- Preserve existing message -> note results and derive their stream ids from note links.
INSERT INTO "message_results" ("message_id", "note_id", "stream_ids", "created_at")
SELECT
    "chat_message"."id",
    "chat_message"."result_note_id",
    COALESCE(
        array_agg("note_stream"."stream_id" ORDER BY "note_stream"."created_at", "note_stream"."stream_id")
            FILTER (WHERE "note_stream"."stream_id" IS NOT NULL),
        ARRAY[]::UUID[]
    ),
    "chat_message"."created_at"
FROM "chat_messages" AS "chat_message"
LEFT JOIN "note_streams" AS "note_stream"
    ON "note_stream"."note_id" = "chat_message"."result_note_id"
WHERE "chat_message"."result_note_id" IS NOT NULL
GROUP BY "chat_message"."id", "chat_message"."result_note_id", "chat_message"."created_at";

-- CreateIndex
CREATE INDEX "message_results_note_id_idx" ON "message_results"("note_id");

-- AddForeignKey
ALTER TABLE "message_results"
ADD CONSTRAINT "message_results_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_results"
ADD CONSTRAINT "message_results_note_id_fkey"
FOREIGN KEY ("note_id") REFERENCES "notes"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_result_note_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "chat_messages_result_note_id_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "result_note_id";
