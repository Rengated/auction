ALTER TABLE "lots"
ADD COLUMN "autoteka_report" JSONB,
ADD COLUMN "autoteka_imported_at" TIMESTAMPTZ;
