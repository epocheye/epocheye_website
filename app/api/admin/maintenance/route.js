import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

// App-wide maintenance mode. When enabled, every NON-ADMIN user of the mobile
// app is held on a blocking "we'll be back shortly" screen at launch; admin
// accounts (users.is_admin, carried on the JWT) get in as normal.
//
// This is the widest-blast-radius switch in the admin console — it takes the
// product down for everyone at once — so the write path logs on the backend and
// the UI confirms before enabling.

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/maintenance",
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

// Body: { enabled: boolean, title?: string, message?: string, eta_text?: string }
// `enabled` is required and must be a real boolean — the backend rejects a
// missing key rather than reading it as false, so maintenance can never switch
// itself off through a malformed request.
export async function PUT(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { success: false, error: "body must include { enabled: true|false }" },
      { status: 400 }
    );
  }

  const payload = { enabled: body.enabled };
  // Only forward copy fields that were actually supplied; the backend COALESCEs
  // absent ones so toggling off and on again preserves the operator's message.
  for (const key of ["title", "message", "eta_text"]) {
    if (typeof body[key] === "string") payload[key] = body[key];
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: "/api/v1/creator/maintenance",
      body: payload,
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
