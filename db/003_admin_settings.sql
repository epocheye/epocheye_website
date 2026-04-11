-- Admin settings: single-row config table for runtime-adjustable payment parameters.
-- Run manually against Supabase: psql $DATABASE_URL -f db/003_admin_settings.sql

CREATE TABLE IF NOT EXISTS admin_settings (
  id                       INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_payout_inr           DECIMAL(10,2) NOT NULL DEFAULT 500,
  default_commission_rate  DECIMAL(5,2)  NOT NULL DEFAULT 10,
  razorpay_payouts_enabled BOOLEAN       NOT NULL DEFAULT true,
  conversion_confirm_days  INT           NOT NULL DEFAULT 7,
  updated_at               TIMESTAMPTZ            DEFAULT NOW()
);

-- Seed the single row (idempotent)
INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Migrate currency defaults to INR on existing tables
ALTER TABLE referral_conversions ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE payout_requests       ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE creators              ALTER COLUMN currency SET DEFAULT 'INR';
