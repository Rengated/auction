-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "yandex_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

