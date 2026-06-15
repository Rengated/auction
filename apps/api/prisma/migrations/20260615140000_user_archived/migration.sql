-- Мягкая архивация пользователей: скрытие из списков, для персонала — запрет входа.
ALTER TABLE "users" ADD COLUMN "archived_at" TIMESTAMPTZ;
