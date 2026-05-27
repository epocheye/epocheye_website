import "server-only";

import { getSql } from "@/lib/server/neon";

/**
 * Stores an early-access signup email. Returns the inserted row, or null if the
 * email already exists (ON CONFLICT DO NOTHING) — callers treat both as success.
 */
export async function saveEarlyAccessSignup({ email, source = "early-access-page" }) {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO early_access_signups (email, source)
    VALUES (${email}, ${source})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, email, created_at
  `;
  return rows[0] ?? null;
}
