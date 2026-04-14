import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getHeritageSql } from "@/lib/server/heritageDb";

export const runtime = "nodejs";

export async function GET(request) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const sql = getHeritageSql();

  const [stats] = await sql`
    SELECT
      COUNT(*)::int AS total_chunks,
      COUNT(*) FILTER (WHERE c.verified = true)::int AS verified_count,
      COUNT(*) FILTER (WHERE c.verified = false)::int AS unverified_count
    FROM heritage_knowledge_chunks c
  `;

  const [sourceStats] = await sql`
    SELECT COUNT(DISTINCT id)::int AS sources_count
    FROM heritage_knowledge_sources
  `;

  const bySource = await sql`
    SELECT s.source_name, COUNT(*)::int AS chunk_count,
           COUNT(*) FILTER (WHERE c.verified = true)::int AS verified_count
    FROM heritage_knowledge_chunks c
    JOIN heritage_knowledge_sources s ON s.id = c.source_id
    GROUP BY s.source_name
    ORDER BY chunk_count DESC
  `;

  const allTags = await sql`
    SELECT DISTINCT unnest(monument_tags) AS tag
    FROM heritage_knowledge_chunks
    ORDER BY tag
  `;

  return NextResponse.json({
    success: true,
    data: {
      total_chunks: stats.total_chunks,
      verified_count: stats.verified_count,
      unverified_count: stats.unverified_count,
      sources_count: sourceStats.sources_count,
      by_source: bySource,
      all_tags: allTags.map((r) => r.tag),
    },
  });
}
