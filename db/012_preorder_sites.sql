-- Migration: pre-orders are now for sites not yet in the app (lib/preorder/sites.js).
-- Optional: lib/server/preorderRepository.js adds the column itself on the
-- first pre-order if it is missing. Kept here as the record of the change.
--
-- monument_slug now holds a site slug from that list, or 'other' with the
-- visitor's own suggestion in the new column. Counts per slug feed the public
-- leaderboard on /preorder.

ALTER TABLE preorders ADD COLUMN IF NOT EXISTS suggestion TEXT;

CREATE INDEX IF NOT EXISTS idx_preorders_monument_slug ON preorders(monument_slug);
