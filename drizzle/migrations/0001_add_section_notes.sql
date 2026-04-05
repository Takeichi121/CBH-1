-- Add section guide note columns to daily_sales_reports
-- Admin-editable guidance text for each section in the daily sales form

ALTER TABLE "daily_sales_reports"
  ADD COLUMN IF NOT EXISTS "note_daily" text,
  ADD COLUMN IF NOT EXISTS "note_mtd" text,
  ADD COLUMN IF NOT EXISTS "note_in_store" text,
  ADD COLUMN IF NOT EXISTS "note_delivery" text,
  ADD COLUMN IF NOT EXISTS "note_performance" text,
  ADD COLUMN IF NOT EXISTS "note_addons" text;
