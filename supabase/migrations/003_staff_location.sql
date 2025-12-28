-- Add location column for staff placement tracking and ensure nullable for backward compatibility.
ALTER TABLE staff ADD COLUMN IF NOT EXISTS location VARCHAR(255);
