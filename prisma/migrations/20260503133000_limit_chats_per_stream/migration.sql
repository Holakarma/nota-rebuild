-- Merge already duplicated chats into the newest chat in each user/stream group.
WITH ranked_chats AS (
    SELECT
        "id",
        first_value("id") OVER (
            PARTITION BY "user_id", "stream_id"
            ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
        ) AS "canonical_id"
    FROM "chats"
),
chats_to_merge AS (
    SELECT "id", "canonical_id"
    FROM ranked_chats
    WHERE "id" <> "canonical_id"
)
UPDATE "chat_messages" AS "chat_message"
SET "chat_id" = "chat_to_merge"."canonical_id"
FROM chats_to_merge AS "chat_to_merge"
WHERE "chat_message"."chat_id" = "chat_to_merge"."id";

WITH ranked_chats AS (
    SELECT
        "id",
        first_value("id") OVER (
            PARTITION BY "user_id", "stream_id"
            ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
        ) AS "canonical_id",
        max("updated_at") OVER (
            PARTITION BY "user_id", "stream_id"
        ) AS "latest_updated_at"
    FROM "chats"
)
UPDATE "chats" AS "chat"
SET "updated_at" = "ranked_chat"."latest_updated_at"
FROM ranked_chats AS "ranked_chat"
WHERE "chat"."id" = "ranked_chat"."canonical_id";

WITH ranked_chats AS (
    SELECT
        "id",
        first_value("id") OVER (
            PARTITION BY "user_id", "stream_id"
            ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
        ) AS "canonical_id"
    FROM "chats"
)
DELETE FROM "chats" AS "chat"
USING ranked_chats AS "ranked_chat"
WHERE "chat"."id" = "ranked_chat"."id"
  AND "ranked_chat"."id" <> "ranked_chat"."canonical_id";

-- Stream chats should not turn into duplicate general chats when a stream is deleted.
ALTER TABLE "chats" DROP CONSTRAINT "chats_stream_id_fkey";

ALTER TABLE "chats"
ADD CONSTRAINT "chats_stream_id_fkey"
FOREIGN KEY ("stream_id") REFERENCES "streams"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- One stream-bound chat per user/stream.
CREATE UNIQUE INDEX "chats_user_id_stream_id_uq"
ON "chats"("user_id", "stream_id");

-- One general chat per user when no stream is selected.
CREATE UNIQUE INDEX "chats_user_id_general_uq"
ON "chats"("user_id")
WHERE "stream_id" IS NULL;
