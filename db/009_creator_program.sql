-- Creator program: terms acceptance, commission bookkeeping, and the admin-
-- controlled list of monuments shown on creators.epocheye.com.
--
-- terms_accepted_at / terms_version: a creator's code is only synced to the
-- app backend (so only works) after they accept the current terms.
-- referral_conversions.commission_rate_used: the tier rate applied to that
-- sale, so later tier moves never rewrite past earnings.
-- 'reversed': refunded / charged-back sales, excluded from balances.
-- admin_settings.creator_monuments: [{name, place}] shown on the creator page,
-- edited in Admin -> Settings -> Creator Page. Starts with the one monument
-- that is live in the app.
ALTER TABLE creators ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS terms_version TEXT;

ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS commission_rate_used DECIMAL(5,2);

ALTER TABLE referral_conversions DROP CONSTRAINT IF EXISTS referral_conversions_status_check;
ALTER TABLE referral_conversions
  ADD CONSTRAINT referral_conversions_status_check
  CHECK (status IN ('pending', 'confirmed', 'paid', 'reversed'));

ALTER TABLE admin_settings
  ADD COLUMN IF NOT EXISTS creator_monuments JSONB NOT NULL
  DEFAULT '[{"name": "Tipu Sultan''s Summer Palace", "place": "Bengaluru"}]'::jsonb;
