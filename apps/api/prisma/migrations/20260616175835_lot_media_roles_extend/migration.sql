-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'director';

-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "autoteka_url" TEXT,
ADD COLUMN     "last_extend_notified_at" TIMESTAMPTZ,
ADD COLUMN     "media_purged_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "extend_throttle_sec" INTEGER NOT NULL DEFAULT 300;
