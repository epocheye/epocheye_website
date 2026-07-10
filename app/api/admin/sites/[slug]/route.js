import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

// Activate/deactivate one site. Flips monuments.recognition_enabled only —
// non-destructive: no object, embedding, or cache data is touched, so a later
// re-enable restores exact prior behaviour. Body: { enabled: boolean }.
export async function PATCH(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { success: false, error: "body must be { enabled: true|false }" },
      { status: 400 }
    );
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PATCH",
      path: `/api/v1/creator/sites/${encodeURIComponent(slug)}/recognition`,
      body: { enabled: body.enabled },
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
