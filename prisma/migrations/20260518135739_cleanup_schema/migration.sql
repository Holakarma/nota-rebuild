/*
  Warnings:

  - You are about to drop the column `reply_to_message_id` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `stream_ids` on the `message_results` table. All the data in the column will be lost.
  - You are about to drop the column `source_meta` on the `notes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_reply_to_message_id_fkey";

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_user_id_fkey";

-- DropIndex
DROP INDEX "chats_user_id_stream_id_uq";

-- DropIndex
DROP INDEX "chats_user_id_updated_at_idx";

-- CreateTable
CREATE TABLE "message_result_streams" (
    "message_id" UUID NOT NULL,
    "stream_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_result_streams_pkey" PRIMARY KEY ("message_id","stream_id")
);

-- Preserve existing message result stream ids before dropping the array column.
INSERT INTO "message_result_streams" ("message_id", "stream_id", "created_at")
SELECT
    "message_result"."message_id",
    "stream_id"."value",
    "message_result"."created_at"
FROM "message_results" AS "message_result"
CROSS JOIN LATERAL unnest("message_result"."stream_ids") AS "stream_id"("value")
ON CONFLICT ("message_id", "stream_id") DO NOTHING;

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "reply_to_message_id",
DROP COLUMN "role";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "user_id";

-- AlterTable
ALTER TABLE "message_results" DROP COLUMN "stream_ids";

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "source_meta";

-- DropEnum
DROP TYPE "chat_message_role";

-- CreateIndex
CREATE INDEX "message_result_streams_stream_id_message_id_idx" ON "message_result_streams"("stream_id", "message_id");

-- AddForeignKey
ALTER TABLE "message_result_streams" ADD CONSTRAINT "message_result_streams_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_results"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_result_streams" ADD CONSTRAINT "message_result_streams_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
