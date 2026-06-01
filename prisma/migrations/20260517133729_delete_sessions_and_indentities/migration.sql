/*
  Warnings:

  - You are about to drop the column `source_message_id` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the column `source_type` on the `notes` table. All the data in the column will be lost.
  - You are about to drop the `auth_identities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `telegram_link_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "auth_identities" DROP CONSTRAINT "auth_identities_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_source_message_id_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "telegram_link_tokens" DROP CONSTRAINT "telegram_link_tokens_user_id_fkey";

-- DropIndex
DROP INDEX "notes_source_message_id_uq";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "noteId" UUID;

-- AlterTable
ALTER TABLE "notes" DROP COLUMN "source_message_id",
DROP COLUMN "source_type";

-- DropTable
DROP TABLE "auth_identities";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "telegram_link_tokens";

-- DropEnum
DROP TYPE "auth_provider";

-- DropEnum
DROP TYPE "note_source_type";

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
