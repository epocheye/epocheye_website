import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

const LINK_PREFIX = "epocheye://";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Queue a broadcast (or send a test to one user) through the Go backend.
 *
 * The backend now runs a broadcast as an async job and answers 202 with a
 * `job_id` (apis/notifications/broadcast_jobs.go), so this passes its JSON and
 * status straight through instead of claiming "initiated" for every outcome.
 * The page polls GET ./[id] for the honest result.
 */
export async function POST(request) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { type, title, message, data, link, idempotency_key, test_to_self, test_user_id } =
    body ?? {};
  if (!type || !title || !message) {
    return NextResponse.json(
      { success: false, error: "type, title, and message are required" },
      { status: 400 }
    );
  }
  if (link && (typeof link !== "string" || !link.startsWith(LINK_PREFIX))) {
    return NextResponse.json(
      { success: false, error: `link must start with ${LINK_PREFIX}` },
      { status: 400 }
    );
  }
  if (test_to_self && !UUID_RE.test(test_user_id ?? "")) {
    return NextResponse.json(
      { success: false, error: "A test send needs the app user ID (a UUID) to send to" },
      { status: 400 }
    );
  }

  let upstream;
  try {
    upstream = await fetch(
      `${goBackendUrl.replace(/\/$/, "")}/api/notifications/admin/broadcast`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          type,
          title,
          message,
          data: data ?? {},
          ...(link ? { link } : {}),
          ...(idempotency_key ? { idempotency_key } : {}),
          ...(test_to_self ? { test_to_self: true, test_user_id } : {}),
        }),
      }
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

  return NextResponse.json({ success: true, ...(json ?? {}) }, { status: upstream.status });
}
