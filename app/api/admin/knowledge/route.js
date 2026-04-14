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

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = 50;
  const offset = (page - 1) * perPage;
  const verified = searchParams.get("verified"); // "true" | "false" | null (all)
  const sourceName = searchParams.get("source_name");
  const monumentTag = searchParams.get("monument_tag");
  const search = searchParams.get("search");

  const sql = getHeritageSql();

  // Build WHERE clauses dynamically
  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (verified === "true") {
    conditions.push(`c.verified = true`);
  } else if (verified === "false") {
    conditions.push(`c.verified = false`);
  }

  if (sourceName) {
    conditions.push(`s.source_name = $${paramIdx}`);
    params.push(sourceName);
    paramIdx++;
  }

  if (monumentTag) {
    conditions.push(`c.monument_tags @> ARRAY[$${paramIdx}]::text[]`);
    params.push(monumentTag);
    paramIdx++;
  }

  if (search) {
    conditions.push(`c.chunk_text ILIKE '%' || $${paramIdx} || '%'`);
    params.push(search);
    paramIdx++;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countQuery = `
    SELECT COUNT(*) as total
    FROM heritage_knowledge_chunks c
    JOIN heritage_knowledge_sources s ON s.id = c.source_id
    ${whereClause}
  `;
  const countResult = await sql(countQuery, params);
  const total = parseInt(countResult[0]?.total || "0", 10);

  // Fetch page
  const dataQuery = `
    SELECT c.id, c.chunk_text, c.chunk_index, c.total_chunks,
           c.monument_tags, c.verified, c.verified_at, c.verified_by,
           c.verification_notes, c.created_at,
           s.source_name, s.source_url, s.document_title
    FROM heritage_knowledge_chunks c
    JOIN heritage_knowledge_sources s ON s.id = c.source_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
  `;

  const data = await sql(dataQuery, [...params, perPage, offset]);

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    per_page: perPage,
  });
}
