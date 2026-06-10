-- CreateEnum
CREATE TYPE "Role" AS ENUM ('buyer', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('draft', 'upcoming', 'live', 'sold', 'finished', 'withdrawn');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('pending', 'contract', 'closed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('outbid', 'won', 'lot_starting', 'lot_ending', 'deal_update', 'system');

-- CreateEnum
CREATE TYPE "SellRequestStatus" AS ENUM ('new', 'in_review', 'accepted', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "yandex_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'buyer',
    "display_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "full_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "contacts_filled_at" TIMESTAMPTZ,
    "blocked_until" TIMESTAMPTZ,
    "block_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" UUID NOT NULL,
    "make" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "LotStatus" NOT NULL DEFAULT 'draft',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "start_price" BIGINT NOT NULL,
    "reserve_price" BIGINT NOT NULL,
    "bid_step" BIGINT,
    "current_price" BIGINT NOT NULL,
    "current_bid_id" UUID,
    "reserve_met" BOOLEAN NOT NULL DEFAULT false,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "original_ends_at" TIMESTAMPTZ NOT NULL,
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "watchers_count" INTEGER NOT NULL DEFAULT 0,
    "mileage" INTEGER NOT NULL,
    "engine" TEXT NOT NULL,
    "power" INTEGER NOT NULL,
    "fuel" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "drive" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "vin" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "options" JSONB NOT NULL DEFAULT '[]',
    "autoteka" JSONB,
    "relisted_from_lot_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_photos" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "object_key" TEXT NOT NULL,
    "external_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "client_bid_id" UUID NOT NULL,
    "rejected_at" TIMESTAMPTZ,
    "rejected_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "winner_user_id" UUID NOT NULL,
    "winning_bid_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "fee_rate" DECIMAL(6,4) NOT NULL,
    "fee_amount" BIGINT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'pending',
    "manager_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","lot_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sell_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "mileage" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "status" "SellRequestStatus" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sell_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "fee_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.015,
    "default_bid_step" BIGINT NOT NULL DEFAULT 20000,
    "antisnipe_enabled" BOOLEAN NOT NULL DEFAULT true,
    "antisnipe_window_sec" INTEGER NOT NULL DEFAULT 120,
    "antisnipe_extension_sec" INTEGER NOT NULL DEFAULT 120,
    "manager_contacts" JSONB NOT NULL DEFAULT '{}',
    "notification_toggles" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_events" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "actor_user_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auction_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_yandex_id_key" ON "users"("yandex_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "lots_current_bid_id_key" ON "lots"("current_bid_id");

-- CreateIndex
CREATE INDEX "lots_status_ends_at_idx" ON "lots"("status", "ends_at");

-- CreateIndex
CREATE INDEX "lots_status_starts_at_idx" ON "lots"("status", "starts_at");

-- CreateIndex
CREATE INDEX "lot_photos_lot_id_sort_idx" ON "lot_photos"("lot_id", "sort");

-- CreateIndex
CREATE INDEX "bids_lot_id_amount_idx" ON "bids"("lot_id", "amount" DESC);

-- CreateIndex
CREATE INDEX "bids_lot_id_created_at_idx" ON "bids"("lot_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "bids_user_id_created_at_idx" ON "bids"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "bids_lot_id_client_bid_id_key" ON "bids"("lot_id", "client_bid_id");

-- CreateIndex
CREATE UNIQUE INDEX "deals_lot_id_key" ON "deals"("lot_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "auction_events_lot_id_created_at_idx" ON "auction_events"("lot_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_current_bid_id_fkey" FOREIGN KEY ("current_bid_id") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_photos" ADD CONSTRAINT "lot_photos_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sell_requests" ADD CONSTRAINT "sell_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_events" ADD CONSTRAINT "auction_events_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
