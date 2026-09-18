import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { syncPromoCodeToBackend } from "@/lib/server/backendSync";
import {
  findCreatorById,
  listActivePromoCodesByCreator,
  markPromoCodeSynced,
  toPublicProfile,
  updateCreator,
} from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  const resolved = await params;
  const creator = await findCreatorById(resolved?.id);
  if (!creator) {
    return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: toPublicProfile(creator) });
}

export async function PUT(request, { params }) {
  const adminCheck = verifyAdminJWTFromRequest(request);
  if (!adminCheck.ok) {
    return NextResponse.json(
      { success: false, error: adminCheck.message },
      { status: adminCheck.status }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const updates = {};

  if (body.commission_rate !== undefined) {
    const commissionRate = Number(body.commission_rate);
    if (!Number.isFinite(commissionRate) || commissionRate < 5 || commissionRate > 20) {
      return NextResponse.json(
        { success: false, error: "commission_rate must be between 5 and 20" },
        { status: 400 }
      );
    }
    updates.commission_rate = commissionRate;
  }

  if (body.customer_discount !== undefined) {
    // Must match what the app's coupon backend accepts (whole numbers, 5-25).
    const customerDiscount = Number(body.customer_discount);
    if (!Number.isInteger(customerDiscount) || customerDiscount < 5 || customerDiscount > 25) {
      return NextResponse.json(
        { success: false, error: "customer_discount must be a whole number between 5 and 25" },
        { status: 400 }
      );
    }
    updates.customer_discount = customerDiscount;
  }

  if (body.status !== undefined) {
    if (!["active", "suspended"].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "status must be active or suspended" },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }

  const resolved = await params;
  const updated = await updateCreator(resolved?.id, updates);
  if (!updated) {
    return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
  }

  // The app charges whatever discount the backend holds for the code, so push
  // a changed discount to every active promo code of this creator.
  let backendSynced;
  if ("customer_discount" in updates) {
    const promos = await listActivePromoCodesByCreator(updated.id);
    const results = await Promise.all(
      promos.map(async (promo) => {
        const ok = await syncPromoCodeToBackend(updated, promo.code);
        if (ok) await markPromoCodeSynced(promo.id).catch(() => {});
        return ok;
      })
    );
    backendSynced = results.every(Boolean);
  }

  return NextResponse.json({ success: true, data: toPublicProfile(updated), backendSynced });
}
