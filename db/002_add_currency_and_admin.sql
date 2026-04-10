-- Migration 002: Add multi-currency support and admin users table
-- Run against the website's Neon DATABASE_URL

-- Add currency preference and country to creators
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR'
    CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED')),
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Admin users table (independent from Clerk — email/password login)
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add admin_users to CREATOR_UPDATE_FIELDS is handled in code (not SQL).

-- Seed: create the first admin user.
-- Replace the email and bcrypt hash below before running.
-- Generate hash: node -e "const b=require('bcrypt');b.hash('YOUR_PASSWORD',10).then(console.log)"
-- INSERT INTO admin_users (email, password_hash)
-- VALUES ('admin@epocheye.app', '$2b$10$REPLACE_WITH_REAL_HASH');
