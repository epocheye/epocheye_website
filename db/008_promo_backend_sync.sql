-- When each creator promo code was last accepted by the Go backend (the app's
-- coupon store). NULL = never synced; the website retries on the creator's
-- next request until it succeeds, so a failed first sync is no longer final.
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS backend_synced_at TIMESTAMPTZ;
