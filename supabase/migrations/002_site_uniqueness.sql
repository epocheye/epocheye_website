-- Enforce unique site names per organization (case-insensitive) to prevent duplicate dashboard creation during signup.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sites_org_name_ci ON sites (org_id, lower(name));
