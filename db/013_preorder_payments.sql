-- Migration: pre-orders are paid through Razorpay Checkout.
-- Optional: lib/server/preorderRepository.js applies this itself, once per
-- server instance. Kept here as the record of the change.
--
-- payment_status: 'interested' (free sign-ups from before payments; not on the
-- leaderboard), 'pending' (Razorpay order opened), 'paid' (counted).

ALTER TABLE preorders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'interested',
  ADD COLUMN IF NOT EXISTS amount_minor INTEGER,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_preorders_razorpay_order
  ON preorders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
