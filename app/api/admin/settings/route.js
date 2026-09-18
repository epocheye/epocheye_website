import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { syncFreeAccessCodeToBackend } from "@/lib/server/backendSync";
import {
  getAdminSettings,
  normalizeMonuments,
  updateAdminSettings,
} from "@/lib/server/creatorRepository";

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

  if ("product_name" in body) {
    const v = String(body.product_name ?? "").trim();
    if (!v) {
      return NextResponse.json({ success: false, error: "product_name cannot be empty" }, { status: 400 });
    }
    updates.product_name = v;
  }

  if ("product_description" in body) {
    updates.product_description = String(body.product_description ?? "").trim();
  }

  if ("product_price_inr" in body) {
    const v = Number(body.product_price_inr);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ success: false, error: "product_price_inr must be a non-negative number" }, { status: 400 });
    }
    updates.product_price_inr = v;
  }

  if ("product_validity_days" in body) {
    const v = Number(body.product_validity_days);
    if (!Number.isFinite(v) || v < 1 || !Number.isInteger(v)) {
      return NextResponse.json({ success: false, error: "product_validity_days must be a positive integer" }, { status: 400 });
    }
    updates.product_validity_days = v;
  }

  if ("product_enabled" in body) {
    updates.product_enabled = !!body.product_enabled;
  }

  if ("offer_enabled" in body) {
    if (typeof body.offer_enabled !== "boolean") {
      return NextResponse.json({ success: false, error: "offer_enabled must be a boolean" }, { status: 400 });
    }
    updates.offer_enabled = body.offer_enabled;
  }

  if ("offer_total" in body) {
    const v = Number(body.offer_total);
    if (!Number.isInteger(v) || v < 1) {
      return NextResponse.json({ success: false, error: "offer_total must be a positive integer" }, { status: 400 });
    }
    updates.offer_total = v;
  }

  if ("offer_claimed" in body) {
    const v = Number(body.offer_claimed);
    if (!Number.isInteger(v) || v < 0) {
      return NextResponse.json({ success: false, error: "offer_claimed must be a non-negative integer" }, { status: 400 });
    }
    updates.offer_claimed = v;
  }

  if ("offer_claimed" in updates || "offer_total" in updates) {
    const current = await getAdminSettings();
    const claimed = updates.offer_claimed ?? current.offer_claimed;
    const total = updates.offer_total ?? current.offer_total;
    if (claimed > total) {
      return NextResponse.json({ success: false, error: `offer_claimed cannot exceed offer_total (${total})` }, { status: 400 });
    }
  }

  if ("offer_promo_code" in body) {
    const v = String(body.offer_promo_code ?? "").trim().toUpperCase();
    if (v.length > 32 || !/^[A-Z0-9_-]*$/.test(v)) {
      return NextResponse.json({ success: false, error: "offer_promo_code must be up to 32 letters, digits, - or _" }, { status: 400 });
    }
    updates.offer_promo_code = v;
  }

  // Monuments listed on creators.epocheye.com. Only list monuments that are
  // live in the app: the creator page tells creators sales happen there.
  if ("creator_monuments" in body) {
    if (!Array.isArray(body.creator_monuments)) {
      return NextResponse.json({ success: false, error: "creator_monuments must be a list" }, { status: 400 });
    }
    const monuments = normalizeMonuments(body.creator_monuments);
    if (monuments.length === 0 || monuments.length > 20) {
      return NextResponse.json(
        { success: false, error: "List between 1 and 20 monuments on the creator page" },
        { status: 400 }
      );
    }
    if (monuments.some((m) => m.name.length > 80 || m.place.length > 60)) {
      return NextResponse.json(
        { success: false, error: "Monument names are max 80 characters, places max 60" },
        { status: 400 }
      );
    }
    updates.creator_monuments = monuments;
  }

  await updateAdminSettings(updates);
  const settings = await getAdminSettings();

  // The app redeems the offer code against the Go backend, so keep it in step.
  let offerSynced;
  if (["offer_enabled", "offer_total", "offer_promo_code"].some((k) => k in updates)) {
    offerSynced = await syncFreeAccessCodeToBackend({
      code: settings.offer_promo_code,
      total: settings.offer_total,
      enabled: settings.offer_enabled,
    });
  }

  return NextResponse.json({ success: true, data: settings, offerSynced });
}
