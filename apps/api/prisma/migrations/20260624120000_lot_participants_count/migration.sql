-- Денормализованный счётчик уникальных участников торга (неотклонённые ставки), как bid_count.
ALTER TABLE "lots" ADD COLUMN "participants_count" INTEGER NOT NULL DEFAULT 0;

-- Бэкфилл по существующим ставкам.
UPDATE "lots" SET "participants_count" = sub.cnt
FROM (
  SELECT "lot_id", COUNT(DISTINCT "user_id")::int AS cnt
  FROM "bids"
  WHERE "rejected_at" IS NULL
  GROUP BY "lot_id"
) AS sub
WHERE "lots"."id" = sub."lot_id";
