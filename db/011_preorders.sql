-- Migration: pre-orders from the /preorder page.
-- Run manually against the same DB as 003_admin_settings.sql.
--
-- A pre-order holds a visitor's place for one monument. Nothing is charged.
-- One row per (email, monument): ordering the same monument again updates the
-- row and keeps its reference, so a double submit never creates a duplicate.

CREATE TABLE IF NOT EXISTS preorders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  monument_slug  TEXT NOT NULL,
  visit_month    TEXT,
  marketing_ok   BOOLEAN NOT NULL DEFAULT FALSE,
  ip_hash        TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_preorders_email_monument UNIQUE (email, monument_slug)
);

CREATE INDEX IF NOT EXISTS idx_preorders_created_at ON preorders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preorders_ip_hash ON preorders(ip_hash, created_at) WHERE ip_hash IS NOT NULL;
