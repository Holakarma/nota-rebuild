/*
  Warnings:

  - You are about to drop the column `deleted_at` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `chat_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `message_result_streams` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `message_results` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "message_result_streams" DROP CONSTRAINT "message_result_streams_message_id_fkey";

-- DropForeignKey
ALTER TABLE "message_result_streams" DROP CONSTRAINT "message_result_streams_stream_id_fkey";

-- DropForeignKey
ALTER TABLE "message_results" DROP CONSTRAINT "message_results_message_id_fkey";

-- DropForeignKey
ALTER TABLE "message_results" DROP CONSTRAINT "message_results_note_id_fkey";

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "deleted_at",
ADD COLUMN     "from_message_id" UUID;

-- AlterTable
ALTER TABLE "streams" ADD COLUMN     "from_message_id" UUID;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "last_login_at";

-- DropTable
DROP TABLE "chat_messages";

-- DropTable
DROP TABLE "message_result_streams";

-- DropTable
DROP TABLE "message_results";

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_id" UUID NOT NULL,
    "body_markdown" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_chat_id_created_at_idx" ON "messages"("chat_id", "created_at");

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_from_message_id_fkey" FOREIGN KEY ("from_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_from_message_id_fkey" FOREIGN KEY ("from_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
