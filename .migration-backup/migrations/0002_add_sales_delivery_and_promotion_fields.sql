ALTER TABLE "daily_sales_reports"
  ADD COLUMN IF NOT EXISTS "sales_delivery" text DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "promotion_other1_qty" text DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "promotion_other2_qty" text DEFAULT '0';
