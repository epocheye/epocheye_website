import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

/**
 * GET /api/admin/ar/catalog?monument_id=...
 *
 * Lists curated AR catalog entries (objects with an uploaded GLB). Proxies to
 * the Go backend's `/api/v1/creator/ar-catalog`. Without the monument_id
 * filter, returns the full catalog across every site.
 */
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const monumentId = url.searchParams.get("monument_id") || "";

  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/ar-catalog",
      query: monumentId ? { monument_id: monumentId } : undefined,
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
