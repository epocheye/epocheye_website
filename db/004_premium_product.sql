-- Migration: Extend admin_settings with Epocheye Premium product fields
-- Target database: Supabase (website DB)
-- Run manually against the same DB as 003_admin_settings.sql.

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS product_name           TEXT          NOT NULL DEFAULT 'Epocheye Premium',
  ADD COLUMN IF NOT EXISTS product_description    TEXT          NOT NULL DEFAULT 'Unlock all premium tours and features.',
  ADD COLUMN IF NOT EXISTS product_price_inr      DECIMAL(10,2) NOT NULL DEFAULT 499,
  ADD COLUMN IF NOT EXISTS product_validity_days  INT           NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS product_enabled        BOOLEAN       NOT NULL DEFAULT TRUE;
