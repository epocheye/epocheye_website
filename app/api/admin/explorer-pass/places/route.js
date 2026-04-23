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
      path: "/api/v1/creator/explorer-pass/places",
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
  const placeId = String(body.place_id ?? "").trim();
  const placeName = String(body.place_name ?? "").trim();
  if (!placeId || !placeName) {
    return NextResponse.json({ success: false, error: "place_id and place_name are required" }, { status: 400 });
  }
  const payload = {
    place_id: placeId,
    place_name: placeName,
    price_paise: body.price_paise === "" || body.price_paise == null ? null : Number(body.price_paise),
    place_type: body.place_type || null,
    lat: body.lat == null ? null : Number(body.lat),
    lng: body.lng == null ? null : Number(body.lng),
    notes: body.notes ? String(body.notes) : "",
  };
  try {
    const res = await backendProxy(auth.payload, {
      method: "POST",
      path: "/api/v1/creator/explorer-pass/places",
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
