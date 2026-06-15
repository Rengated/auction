-- Архив лота: мягкое скрытие из каталога и основных списков.
ALTER TABLE "lots" ADD COLUMN "archived_at" TIMESTAMPTZ;
