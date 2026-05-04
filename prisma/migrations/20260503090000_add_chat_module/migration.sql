-- CreateEnum
CREATE TYPE "chat_message_role" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "chat_message_kind" AS ENUM ('USER_INPUT', 'NOTE_CREATED');

-- AlterTable
ALTER TABLE "notes" ADD COLUMN "source_message_id" UUID;

-- CreateTable
CREATE TABLE "chats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "stream_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_id" UUID NOT NULL,
    "role" "chat_message_role" NOT NULL,
    "kind" "chat_message_kind" NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "reply_to_message_id" UUID,
    "result_note_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chats_user_id_updated_at_idx" ON "chats"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_chat_id_created_at_idx" ON "chat_messages"("chat_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_result_note_id_idx" ON "chat_messages"("result_note_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_source_message_id_uq" ON "notes"("source_message_id");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_result_note_id_fkey" FOREIGN KEY ("result_note_id") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_source_message_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
