import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getHeritageSql } from "@/lib/server/heritageDb";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "source id is required" },
      { status: 400 }
    );
  }

  const sql = getHeritageSql();
  const rows = await sql(
    `UPDATE heritage_knowledge_sources
     SET is_active = FALSE
     WHERE id = $1
     RETURNING id, source_name, is_active`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, error: "source not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: rows[0] });
}
