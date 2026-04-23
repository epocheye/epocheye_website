import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  const q = new URL(request.url).searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json({ success: false, error: "q is required" }, { status: 400 });
  }
  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: `/api/v1/creator/places/search?q=${encodeURIComponent(q)}`,
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
