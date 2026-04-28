import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

/**
 * GET /api/admin/ar/unknown-scans?status=&monument_id=
 *
 * Lists visitor-submitted unknown-object scans for admin triage. Default
 * status='active' returns pending + queued (the actionable triage view).
 * Other statuses: pending, queued, generated, rejected.
 */
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const monumentId = url.searchParams.get("monument_id") || "";

  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/ar-unknown-scans",
      query: {
        status: status || undefined,
        monument_id: monumentId || undefined,
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.data?.error || "Backend error" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message || "Network error" },
      { status: 502 }
    );
  }
}
