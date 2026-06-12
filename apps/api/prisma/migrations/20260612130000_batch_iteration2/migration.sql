-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('photo', 'video');

-- AlterEnum
BEGIN;
CREATE TYPE "DealStatus_new" AS ENUM ('in_progress', 'completed', 'cancelled');
ALTER TABLE "public"."deals" ALTER COLUMN "status" DROP DEFAULT;
-- маппинг старых статусов: pending/contract -> in_progress, closed -> completed
ALTER TABLE "deals" ALTER COLUMN "status" TYPE "DealStatus_new" USING (
  CASE "status"::text WHEN 'closed' THEN 'completed' ELSE 'in_progress' END
)::"DealStatus_new";
ALTER TYPE "DealStatus" RENAME TO "DealStatus_old";
ALTER TYPE "DealStatus_new" RENAME TO "DealStatus";
DROP TYPE "public"."DealStatus_old";
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'in_progress';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'lot_extended';
ALTER TYPE "NotificationType" ADD VALUE 'lot_withdrawn';

-- DropForeignKey
ALTER TABLE "sell_requests" DROP CONSTRAINT "sell_requests_user_id_fkey";

-- AlterTable
ALTER TABLE "deals" ALTER COLUMN "status" SET DEFAULT 'in_progress';

-- AlterTable
ALTER TABLE "lot_photos" ADD COLUMN     "kind" "MediaKind" NOT NULL DEFAULT 'photo';

-- AlterTable
ALTER TABLE "lots" DROP COLUMN "autoteka",
ADD COLUMN     "autoteka_pdf_key" TEXT,
ADD COLUMN     "fee_rate" DECIMAL(6,4);

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "telegram_bot_token" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "telegram_channel_id" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "city",
ADD COLUMN     "notification_prefs" JSONB NOT NULL DEFAULT '{}';

-- DropTable
DROP TABLE "sell_requests";

-- DropEnum
DROP TYPE "SellRequestStatus";

