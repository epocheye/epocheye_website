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
      path: "/api/v1/creator/ar-config",
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, error: res.data?.error || "Backend error" }, { status: res.status });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message || "Network error" }, { status: 502 });
  }
}

const ALLOWED_PROVIDERS = new Set(["mock", "sagemaker", "vertex"]);

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

  if ("provider" in body) {
    const v = String(body.provider ?? "").trim().toLowerCase();
    if (!ALLOWED_PROVIDERS.has(v)) {
      return NextResponse.json({ success: false, error: "provider must be mock, sagemaker, or vertex" }, { status: 400 });
    }
    updates.provider = v;
  }

  if ("enabled" in body) updates.enabled = !!body.enabled;
  if ("maintenance_mode" in body) updates.maintenance_mode = !!body.maintenance_mode;

  if ("free_daily_quota" in body) {
    const v = Number(body.free_daily_quota);
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      return NextResponse.json({ success: false, error: "free_daily_quota must be a non-negative integer" }, { status: 400 });
    }
    updates.free_daily_quota = v;
  }

  if ("premium_daily_quota" in body) {
    const v = Number(body.premium_daily_quota);
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      return NextResponse.json({ success: false, error: "premium_daily_quota must be a non-negative integer" }, { status: 400 });
    }
    updates.premium_daily_quota = v;
  }

  if ("sagemaker_endpoint" in body) {
    updates.sagemaker_endpoint = String(body.sagemaker_endpoint ?? "").trim();
  }
  if ("vertex_endpoint" in body) {
    updates.vertex_endpoint = String(body.vertex_endpoint ?? "").trim();
  }

  if (
    "free_daily_quota" in updates &&
    "premium_daily_quota" in updates &&
    updates.premium_daily_quota < updates.free_daily_quota
  ) {
    return NextResponse.json(
      { success: false, error: "premium_daily_quota must be >= free_daily_quota" },
      { status: 400 }
    );
  }

  try {
    const res = await backendProxy(auth.payload, {
      method: "PUT",
      path: "/api/v1/creator/ar-config",
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
