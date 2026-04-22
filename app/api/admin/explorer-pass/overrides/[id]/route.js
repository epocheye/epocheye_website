import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "place_id is required" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = {
    place_name: String(body.place_name ?? "").trim(),
    price_paise: body.price_paise === null || body.price_paise === "" ? null : Number(body.price_paise),
    access_hours: body.access_hours === null || body.access_hours === "" ? null : Number(body.access_hours),
    notes: body.notes ? String(body.notes) : "",
  };
  if (!payload.place_name) {
    return NextResponse.json({ success: false, error: "place_name is required" }, { status: 400 });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: `/api/v1/creator/explorer-pass/pricing/overrides/${encodeURIComponent(id)}`,
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

export async function DELETE(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ success: false, error: "place_id is required" }, { status: 400 });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "DELETE",
      path: `/api/v1/creator/explorer-pass/pricing/overrides/${encodeURIComponent(id)}`,
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
