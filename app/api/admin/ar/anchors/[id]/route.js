import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const anchorId = String(id ?? "").trim();
  if (!anchorId) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "DELETE",
      path: `/api/v1/creator/ar-anchors/${encodeURIComponent(anchorId)}`,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}

export async function PATCH(request, { params }) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { id } = await params;
  const anchorId = String(id ?? "").trim();
  if (!anchorId) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PATCH",
      path: `/api/v1/creator/ar-anchors/${encodeURIComponent(anchorId)}`,
      body,
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}
