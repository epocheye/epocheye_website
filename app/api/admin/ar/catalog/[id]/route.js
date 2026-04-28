import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

/**
 * DELETE /api/admin/ar/catalog/[id]
 *
 * Clears the GLB + reference images for a curated catalog entry. Proxies to
 * the Go backend's `/api/v1/creator/ar-catalog/{id}`. Preserves the
 * monument_objects metadata row (lens enrichment depends on it).
 */
export async function DELETE(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const entryId = String(id ?? "").trim();
  if (!entryId) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "DELETE",
      path: `/api/v1/creator/ar-catalog/${encodeURIComponent(entryId)}`,
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
