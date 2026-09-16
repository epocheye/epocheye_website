-- Migration: Bangalore launch offer ("first 500 free") shown on the landing page
-- Run manually against the same DB as 003_admin_settings.sql.

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS offer_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS offer_claimed     INT     NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS offer_total       INT     NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS offer_promo_code  TEXT    NOT NULL DEFAULT '';
