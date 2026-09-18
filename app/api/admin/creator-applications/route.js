import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getAdminSettings } from "@/lib/server/creatorRepository";
import { getSql } from "@/lib/server/neon";

export const runtime = "nodejs";

// Pending creator applications + how many creators are approved (vs the cap).
export async function GET(request) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json({ success: false, error: adminCheck.message }, { status: adminCheck.status });
  }

  const sql = getSql();
  const [pending, counts, settings] = await Promise.all([
    sql`
      SELECT id, name, email, application, applied_at, created_at, status
      FROM creators
      WHERE status IN ('pending', 'rejected')
      ORDER BY (application IS NULL), applied_at DESC NULLS LAST, created_at DESC
    `,
    sql`SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS approved FROM creators`,
    getAdminSettings(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      applications: pending,
      approved: Number(counts[0]?.approved ?? 0),
      max_creators: settings.max_creators,
    },
  });
}
