-- Migration: emails of iPhone visitors waiting for Epocheye on the App Store.
-- Optional: lib/server/iosWaitlistRepository.js creates this itself, once per
-- server instance. Kept here as the record of the change.

CREATE TABLE IF NOT EXISTS ios_waitlist (
  email TEXT PRIMARY KEY,
  source TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ios_waitlist_ip_created ON ios_waitlist(ip_hash, created_at);
