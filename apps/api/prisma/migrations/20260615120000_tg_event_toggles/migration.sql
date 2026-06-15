-- AlterTable: per-event Telegram posting toggles (пусто = постить всё)
ALTER TABLE "settings" ADD COLUMN     "tg_event_toggles" JSONB NOT NULL DEFAULT '{}';

-- Убрана настраиваемая подпись под TG-постами (telegramFooter)
ALTER TABLE "settings" DROP COLUMN "telegram_footer";
