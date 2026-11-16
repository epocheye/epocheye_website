-- Waitlist for the /virtual page (Tipu Sultan's Summer Palace, virtual walk) (2026-10-14).
--
-- One new table, nothing else touched. consent records the required, unticked
-- "Email me when it opens" checkbox (EU/UK). country comes from the edge
-- (x-vercel-ip-country); utm_* and referrer come from the landing URL.
CREATE TABLE IF NOT EXISTS virtual_waitlist (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  country       TEXT,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  referrer      TEXT,
  consent       BOOLEAN NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
