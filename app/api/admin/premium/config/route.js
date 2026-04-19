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
      path: "/api/v1/creator/premium-config",
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

  const updates = {};

  if ("name" in body) {
    const v = String(body.name ?? "").trim();
    if (!v) {
      return NextResponse.json({ success: false, error: "name must not be empty" }, { status: 400 });
    }
    updates.name = v;
  }
  if ("description" in body) {
    const v = String(body.description ?? "").trim();
    if (!v) {
      return NextResponse.json({ success: false, error: "description must not be empty" }, { status: 400 });
    }
    updates.description = v;
  }
  if ("price_inr" in body) {
    const v = Number(body.price_inr);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ success: false, error: "price_inr must be >= 0" }, { status: 400 });
    }
    updates.price_inr = v;
  }
  if ("validity_days" in body) {
    const v = Number(body.validity_days);
    if (!Number.isFinite(v) || !Number.isInteger(v) || v <= 0) {
      return NextResponse.json({ success: false, error: "validity_days must be a positive integer" }, { status: 400 });
    }
    updates.validity_days = v;
  }
  if ("enabled" in body) updates.enabled = !!body.enabled;

  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: "/api/v1/creator/premium-config",
      body: updates,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}
