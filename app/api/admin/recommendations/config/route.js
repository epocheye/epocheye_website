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
      path: "/api/v1/creator/recommendations-config",
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
  for (const key of ["region_weight", "zone_weight", "distance_weight", "distance_decay_km", "baseline"]) {
    if (key in body) {
      const v = Number(body[key]);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ success: false, error: `${key} must be a non-negative number` }, { status: 400 });
      }
      if (key === "distance_decay_km" && v <= 0) {
        return NextResponse.json({ success: false, error: "distance_decay_km must be positive" }, { status: 400 });
      }
      payload[key] = v;
    }
  }
  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: "/api/v1/creator/recommendations-config",
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
