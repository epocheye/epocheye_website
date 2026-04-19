import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { listAdminContent } from "@/lib/server/creatorRepository";

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
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(
    10,
    Math.min(200, Number.parseInt(searchParams.get("limit") || "25", 10)),
  );
  const status = searchParams.get("status") || "all";
  const platform = searchParams.get("platform") || "all";
  const offset = (page - 1) * limit;

  const content = await listAdminContent({ status, platform, limit, offset });
  const totalPages = Math.max(1, Math.ceil(content.total / limit));

  return NextResponse.json(
    {
      success: true,
      data: {
        entries: content.entries,
        total: content.total,
        page,
        limit,
        total_pages: totalPages,
      },
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
      },
    },
  );
}
