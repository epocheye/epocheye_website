-- Invite-only creator program with 2-week site exclusivity (2026-09-19).
--
-- Applications: a new creator starts 'pending' and submits a profile; the
-- admin approves ('active') or rejects. At most admin_settings.max_creators are
-- approved at once. A creator's code works in the app only once approved,
-- terms accepted AND assigned a site.
--
-- site_assignments: one creator per monument for assignment_days. At the end
-- of a window the creator's sales at that site are compared with
-- sales_target: met = renewed for another window, missed = the site passes to
-- the next approved creator in line.
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_status_check;
ALTER TABLE creators
  ADD CONSTRAINT creators_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));
ALTER TABLE creators ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS application JSONB;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS site_slug TEXT;

CREATE TABLE IF NOT EXISTS site_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug        TEXT NOT NULL,
  site_name        TEXT NOT NULL,
  creator_id       UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  starts_at        TIMESTAMPTZ NOT NULL,
  ends_at          TIMESTAMPTZ NOT NULL,
  sales_target     INT NOT NULL,
  sales_in_window  INT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'renewed', 'ended')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);
-- At most one live assignment per site and per creator.
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_assignments_live_site
  ON site_assignments(site_slug) WHERE status <> 'ended';
CREATE UNIQUE INDEX IF NOT EXISTS uq_site_assignments_live_creator
  ON site_assignments(creator_id) WHERE status <> 'ended';

ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS max_creators INT NOT NULL DEFAULT 100;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS assignment_days INT NOT NULL DEFAULT 14;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS assignment_sales_target INT NOT NULL DEFAULT 10;

-- Creator-page monuments now carry the app site slug (used for assignments).
UPDATE admin_settings
   SET creator_monuments = '[{"name": "Tipu Sultan''s Summer Palace", "place": "Bengaluru", "slug": "tipu-summer-palace-bengaluru"}]'::jsonb
 WHERE id = 1
   AND creator_monuments = '[{"name": "Tipu Sultan''s Summer Palace", "place": "Bengaluru"}]'::jsonb;
