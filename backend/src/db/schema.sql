-- ============================================================
-- Epocheye Creator Campaign — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- creators: registered affiliate content creators
CREATE TABLE IF NOT EXISTS creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  instagram_url TEXT,
  youtube_url TEXT,
  tiktok_url TEXT,
  twitter_url TEXT,
  niche TEXT,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,   -- 5–20%, editable by admin
  customer_discount DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- % discount given to referred customer
  upi_id TEXT,                                            -- UPI address for Razorpay payouts
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- promo_codes: one active code per creator (can be expanded to many)
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_creator ON promo_codes(creator_id);

-- referral_clicks: recorded every time someone visits /r/[code]
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_creator ON referral_clicks(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_at ON referral_clicks(clicked_at DESC);

-- referral_conversions: recorded by mobile app backend via webhook on payment
CREATE TABLE IF NOT EXISTS referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  customer_id TEXT,                              -- UID from main Epocheye app
  plan_amount DECIMAL(10,2) NOT NULL,            -- what the customer paid (e.g. 3.00)
  commission_amount DECIMAL(10,2) NOT NULL,      -- creator's share
  discount_amount DECIMAL(10,2) NOT NULL,        -- discount applied to customer
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'paid')),
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversions_code ON referral_conversions(code);
CREATE INDEX IF NOT EXISTS idx_conversions_creator ON referral_conversions(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON referral_conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_at ON referral_conversions(converted_at DESC);

-- content_submissions: creators submit their content posts for tracking
CREATE TABLE IF NOT EXISTS content_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  content_url TEXT NOT NULL,
  platform TEXT NOT NULL
    CHECK (platform IN ('instagram', 'youtube', 'tiktok', 'twitter', 'blog', 'other')),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_creator ON content_submissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_submissions(status);

-- payout_requests: creator withdrawal requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  upi_id TEXT,                          -- snapshot of creator's UPI at request time
  razorpay_payout_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payouts_creator ON payout_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payout_requests(status);

-- blog_posts: marketing blog content authored by admin
CREATE TABLE IF NOT EXISTS blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  cover_image_url TEXT,
  body_markdown   TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_pub ON blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
