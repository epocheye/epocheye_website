import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getHeritageSql } from "@/lib/server/heritageDb";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const { chunkId } = await params;
  const sql = getHeritageSql();

  const rows = await sql`
    SELECT c.id, c.chunk_text, c.chunk_index, c.total_chunks,
           c.monument_tags, c.verified, c.verified_at, c.verified_by,
           c.verification_notes, c.created_at, c.source_id,
           s.source_name, s.source_url, s.document_title, s.is_active
    FROM heritage_knowledge_chunks c
    JOIN heritage_knowledge_sources s ON s.id = c.source_id
    WHERE c.id = ${chunkId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: "Chunk not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: rows[0] });
}

export async function PUT(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const { chunkId } = await params;
  const body = await request.json();
  const { action, verification_notes } = body;
  const sql = getHeritageSql();

  if (action === "verify") {
    await sql`
      UPDATE heritage_knowledge_chunks
      SET verified = true,
          verified_at = NOW(),
          verified_by = ${adminCheck.payload.email},
          verification_notes = COALESCE(${verification_notes || null}, verification_notes)
      WHERE id = ${chunkId}
    `;
    return NextResponse.json({ success: true, action: "verified" });
  }

  if (action === "reject") {
    // Deactivate the parent source for this chunk (soft disable)
    await sql`
      UPDATE heritage_knowledge_sources
      SET is_active = false
      WHERE id = (
        SELECT source_id FROM heritage_knowledge_chunks WHERE id = ${chunkId}
      )
    `;
    return NextResponse.json({ success: true, action: "rejected" });
  }

  if (action === "note") {
    await sql`
      UPDATE heritage_knowledge_chunks
      SET verification_notes = ${verification_notes || ""}
      WHERE id = ${chunkId}
    `;
    return NextResponse.json({ success: true, action: "note_saved" });
  }

  return NextResponse.json(
    { success: false, error: "Invalid action. Use: verify, reject, or note" },
    { status: 400 }
  );
}
