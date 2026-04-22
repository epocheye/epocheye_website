import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { backendProxy } from "@/lib/server/backendAuth";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const query = {
    status: searchParams.get("status") || undefined,
    limit: searchParams.get("limit") || undefined,
    offset: searchParams.get("offset") || undefined,
  };

  try {
    const res = await backendProxy(auth.payload, {
      method: "GET",
      path: "/api/v1/creator/knowledge/submissions",
      query,
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

  const title = String(body.title ?? "").trim();
  const sourceType = String(body.source_type ?? "").trim().toLowerCase();
  if (!title) {
    return NextResponse.json({ success: false, error: "title is required" }, { status: 400 });
  }
  if (!["text", "url", "pdf"].includes(sourceType)) {
    return NextResponse.json(
      { success: false, error: "source_type must be text|url|pdf" },
      { status: 400 }
    );
  }

  const payload = {
    title,
    source_type: sourceType,
    source_url: body.source_url ? String(body.source_url).trim() : "",
    raw_content: body.raw_content ? String(body.raw_content) : "",
    pdf_s3_key: body.pdf_s3_key ? String(body.pdf_s3_key).trim() : "",
    place_type: body.place_type ? String(body.place_type).trim() : "",
    monument_id: body.monument_id ? String(body.monument_id).trim() : "",
    monument_tags: Array.isArray(body.monument_tags) ? body.monument_tags : [],
  };

  try {
    const res = await backendProxy(auth.payload, {
      method: "POST",
      path: "/api/v1/creator/knowledge/submit",
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
