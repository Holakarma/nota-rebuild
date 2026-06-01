/*
  Warnings:

  - You are about to drop the column `kind` on the `chat_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "kind";

-- DropEnum
DROP TYPE "chat_message_kind";
