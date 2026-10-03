import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

/**
 * Whether push notifications can be delivered right now, for the admin page.
 * Proxies the backend's report so the admin key never reaches the browser.
 */
export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const adminKey = process.env.NOTIFICATIONS_ADMIN_KEY;
  const goBackendUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!adminKey || !goBackendUrl) {
    return NextResponse.json(
      { success: false, error: "Notification broadcast is not configured" },
      { status: 503 }
    );
  }

  let upstream;
  try {
    upstream = await fetch(
      `${goBackendUrl.replace(/\/$/, "")}/api/notifications/admin/health`,
      { headers: { "X-Admin-Key": adminKey }, cache: "no-store" }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach the notifications service" },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { success: false, error: json?.error || text || "Upstream error" },
      { status: upstream.status }
    );
  }
  return NextResponse.json({ success: true, ...(json ?? {}) });
}
