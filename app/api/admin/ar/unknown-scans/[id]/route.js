import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

const ALLOWED_ACTIONS = new Set(["queue-meshy", "reject", "link"]);

/**
 * POST /api/admin/ar/unknown-scans/[id]?action=queue-meshy|reject|link
 *
 * Triage actions on a single ar_unknown_scans row:
 *   - queue-meshy: flips status pending→queued so the meshy tick picks it up
 *   - reject:      marks rejected so it leaves the active triage view
 *   - link:        sets asset_id (no Meshy generation) — for "this is just
 *                  another instance of an existing curated asset"
 */
export async function POST(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const scanId = String(id ?? "").trim();
  if (!scanId) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const action = String(url.searchParams.get("action") ?? "").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, error: "action must be queue-meshy, reject, or link" },
      { status: 400 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "POST",
      path: `/api/v1/creator/ar-unknown-scans/${encodeURIComponent(scanId)}/${action}`,
      body,
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
