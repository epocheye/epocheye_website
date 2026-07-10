import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

// Lists ALL heritage sites (any status, enabled or disabled) for the admin
// activate/deactivate page. Optional ?q= filters by name. Proxies to the
// creator-auth backend endpoint. Unlike the Explorer Pass picker this MUST
// include disabled sites so an admin can re-enable them.
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: `/api/v1/creator/sites?q=${encodeURIComponent(q)}`,
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
