import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";

export const runtime = "nodejs";

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

  const { type, title, message, data } = body;
  if (!type || !title || !message) {
    return NextResponse.json(
      { success: false, error: "type, title, and message are required" },
      { status: 400 }
    );
  }

  const upstream = await fetch(
    `${goBackendUrl.replace(/\/$/, "")}/api/notifications/admin/broadcast`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify({ type, title, message, data: data ?? {} }),
    }
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { success: false, error: text || "Upstream error" },
      { status: upstream.status }
    );
  }

  return NextResponse.json({ success: true, message: "Broadcast initiated" }, { status: 202 });
}
