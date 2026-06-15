-- Воронка статусов сделки: won → contacted → signed → delivered (+ cancelled).
-- Заменяет старые in_progress/completed. База пересоздаётся (db:reset), поэтому
-- приведение существующих строк не требуется.

-- AlterEnum
BEGIN;
CREATE TYPE "DealStatus_new" AS ENUM ('won', 'contacted', 'signed', 'delivered', 'cancelled');
ALTER TABLE "public"."deals" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "deals" ALTER COLUMN "status" TYPE "DealStatus_new" USING ("status"::text::"DealStatus_new");
ALTER TYPE "DealStatus" RENAME TO "DealStatus_old";
ALTER TYPE "DealStatus_new" RENAME TO "DealStatus";
DROP TYPE "public"."DealStatus_old";
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'won';
COMMIT;
