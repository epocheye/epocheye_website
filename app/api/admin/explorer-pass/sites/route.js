import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

// Lists curated heritage sites (keyed by slug) for the per-place pricing picker.
// Optional ?q= filters by name. Proxies to the creator-auth backend endpoint.
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: `/api/v1/creator/places/sites?q=${encodeURIComponent(q)}`,
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: res.data?.error || "Backend error" },
        { status: res.status }
      );
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}
