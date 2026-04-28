import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

const ALLOWED_MODES = new Set(["geospatial", "compass"]);

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const monumentId = url.searchParams.get("monument_id") || "";

  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/ar-anchors",
      query: monumentId ? { monument_id: monumentId } : undefined,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}

export async function POST(request) {
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

  const monumentId = String(body.monument_id ?? "").trim();
  const objectLabel = String(body.object_label ?? "").trim();
  const mode = String(body.anchor_mode ?? "geospatial").trim().toLowerCase();

  if (!monumentId || !objectLabel) {
    return NextResponse.json(
      { success: false, error: "monument_id and object_label are required" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MODES.has(mode)) {
    return NextResponse.json(
      { success: false, error: "anchor_mode must be 'geospatial' or 'compass'" },
      { status: 400 }
    );
  }

  const num = (v) => (v === null || v === undefined || v === "" ? undefined : Number(v));

  const upstream = {
    monument_id: monumentId,
    object_label: objectLabel,
    anchor_mode: mode,
    asset_id: body.asset_id ? String(body.asset_id).trim() : undefined,
    lat: num(body.lat),
    lng: num(body.lng),
    altitude: num(body.altitude),
    heading_deg: num(body.heading_deg),
    ref_lat: num(body.ref_lat),
    ref_lng: num(body.ref_lng),
    ref_landmark_url: body.ref_landmark_url || undefined,
    bearing_from_ref: num(body.bearing_from_ref),
    distance_meters: num(body.distance_meters),
  };

  try {
    const res = await backendProxy(auth.payload, {
      method: "POST",
      path: "/api/v1/creator/ar-anchors",
      body: upstream,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}
