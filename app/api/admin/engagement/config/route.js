import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/engagement-config",
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}

export async function PUT(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = {};
  if ("enabled" in body) payload.enabled = !!body.enabled;

  for (const key of [
    "interval_hours",
    "inactivity_threshold_hours",
    "per_user_cooldown_hours",
    "weekly_cap",
    "max_notified_per_tick",
  ]) {
    if (key in body) {
      const v = Number(body[key]);
      if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
        return NextResponse.json({ success: false, error: `${key} must be a non-negative integer` }, { status: 400 });
      }
      payload[key] = v;
    }
  }

  if ("templates" in body) {
    if (!Array.isArray(body.templates)) {
      return NextResponse.json({ success: false, error: "templates must be an array" }, { status: 400 });
    }
    for (const t of body.templates) {
      if (!t || typeof t.title !== "string" || typeof t.body !== "string") {
        return NextResponse.json({ success: false, error: "each template needs title and body strings" }, { status: 400 });
      }
    }
    payload.templates = body.templates;
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: "/api/v1/creator/engagement-config",
      body: payload,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}
