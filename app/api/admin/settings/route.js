import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { getAdminSettings, updateAdminSettings } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const auth = verifyAdminJWTFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status });
  }

  const settings = await getAdminSettings();
  return NextResponse.json({ success: true, data: settings });
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

  if ("min_payout_inr" in body) {
    const v = Number(body.min_payout_inr);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ success: false, error: "min_payout_inr must be a non-negative number" }, { status: 400 });
    }
    updates.min_payout_inr = v;
  }

  if ("default_commission_rate" in body) {
    const v = Number(body.default_commission_rate);
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return NextResponse.json({ success: false, error: "default_commission_rate must be between 0 and 100" }, { status: 400 });
    }
    updates.default_commission_rate = v;
  }

  if ("razorpay_payouts_enabled" in body) {
    updates.razorpay_payouts_enabled = !!body.razorpay_payouts_enabled;
  }

  if ("conversion_confirm_days" in body) {
    const v = Number(body.conversion_confirm_days);
    if (!Number.isFinite(v) || v < 0 || !Number.isInteger(v)) {
      return NextResponse.json({ success: false, error: "conversion_confirm_days must be a non-negative integer" }, { status: 400 });
    }
    updates.conversion_confirm_days = v;
  }

  await updateAdminSettings(updates);
  const settings = await getAdminSettings();
  return NextResponse.json({ success: true, data: settings });
}
