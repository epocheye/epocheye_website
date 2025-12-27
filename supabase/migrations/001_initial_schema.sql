-- Schema for EpochEye heritage analytics

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sites
CREATE TABLE IF NOT EXISTS sites (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 5000,
  location VARCHAR(500),
  annual_visitors INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sites_org_id ON sites(org_id);

-- Zones
CREATE TABLE IF NOT EXISTS zones (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_capacity INTEGER NOT NULL,
  zone_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zones_site_id ON zones(site_id);

-- Crowd data
CREATE TABLE IF NOT EXISTS crowd_data (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  zone_id BIGINT REFERENCES zones(id) ON DELETE CASCADE,
  timestamp TIMESTAMP DEFAULT NOW(),
  count INTEGER NOT NULL,
  density FLOAT
);
CREATE INDEX IF NOT EXISTS idx_crowd_zone_timestamp ON crowd_data(zone_id, timestamp DESC);

-- Visitor analytics
CREATE TABLE IF NOT EXISTS visitor_analytics (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  domestic INTEGER DEFAULT 0,
  foreign_visitors INTEGER DEFAULT 0,
  school_groups INTEGER DEFAULT 0,
  family_groups INTEGER DEFAULT 0,
  solo_travelers INTEGER DEFAULT 0,
  tour_groups INTEGER DEFAULT 0,
  avg_stay_minutes FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_id, date)
);
CREATE INDEX IF NOT EXISTS idx_analytics_site_date ON visitor_analytics(site_id, date DESC);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255),
  role VARCHAR(100),
  shift_start TIME,
  shift_end TIME,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  org_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Report schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  frequency VARCHAR(20) NOT NULL,
  time VARCHAR(10) NOT NULL,
  recipients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Optional tickets table for revenue reporting
CREATE TABLE IF NOT EXISTS tickets (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Helper to extract org claim
CREATE OR REPLACE FUNCTION current_org_id() RETURNS BIGINT AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claims.org_id', TRUE), '')::BIGINT;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Policies
CREATE POLICY org_access_organizations ON organizations USING (id = current_org_id());
CREATE POLICY org_access_sites ON sites USING (org_id = current_org_id());
CREATE POLICY org_access_zones ON zones USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = zones.site_id AND s.org_id = current_org_id()));
CREATE POLICY org_access_crowd ON crowd_data USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = crowd_data.site_id AND s.org_id = current_org_id()));
CREATE POLICY org_access_visitor ON visitor_analytics USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = visitor_analytics.site_id AND s.org_id = current_org_id()));
CREATE POLICY org_access_staff ON staff USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = staff.site_id AND s.org_id = current_org_id()));
CREATE POLICY org_access_users ON users USING (org_id = current_org_id());
CREATE POLICY org_access_report_schedules ON report_schedules USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = report_schedules.site_id AND s.org_id = current_org_id()));
CREATE POLICY org_access_tickets ON tickets USING (EXISTS (SELECT 1 FROM sites s WHERE s.id = tickets.site_id AND s.org_id = current_org_id()));
