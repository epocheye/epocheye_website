-- Migration: pre-orders are now for sites not yet in the app (lib/preorder/sites.js).
-- Run manually after 011_preorders.sql, against the same DB.
--
-- monument_slug now holds a site slug from that list, or 'other' with the
-- visitor's own suggestion in the new column. Counts per slug feed the public
-- leaderboard on /preorder.

ALTER TABLE preorders ADD COLUMN IF NOT EXISTS suggestion TEXT;

CREATE INDEX IF NOT EXISTS idx_preorders_monument_slug ON preorders(monument_slug);
