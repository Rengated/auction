-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "address_id" UUID,
ADD COLUMN     "address_text" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "telegram_contact" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "telegram_footer" TEXT NOT NULL DEFAULT 'Ставка принимается от зарегистрированных участников';

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "full_address" TEXT NOT NULL,
    "city" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
