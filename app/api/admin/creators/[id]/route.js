import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import { syncCreatorCouponState } from "@/lib/server/backendSync";
import { endAssignment, getLiveAssignmentForCreator } from "@/lib/server/creatorSites";
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
    if (!["pending", "active", "rejected", "suspended"].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "status must be pending, active, rejected or suspended" },
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

  // A creator who is no longer active loses their site (and their code goes off).
  if ("status" in updates && updates.status !== "active") {
    const live = await getLiveAssignmentForCreator(updated.id);
    if (live) await endAssignment(live.id);
  }

  // The app charges whatever discount the backend holds for the code, so push
  // a changed discount to every active promo code of this creator.
  // Only approved creators have codes in the backend; the state sync keeps the
  // code limited to their site and window (off when they hold none).
  let backendSynced;
  if ("customer_discount" in updates && updated.status === "active" && updated.terms_accepted_at) {
    const promos = await listActivePromoCodesByCreator(updated.id);
    const live = await getLiveAssignmentForCreator(updated.id);
    const results = await Promise.all(
      promos.map(async (promo) => {
        const ok = await syncCreatorCouponState(updated, promo.code, live);
        if (ok) await markPromoCodeSynced(promo.id).catch(() => {});
        return ok;
      })
    );
    backendSynced = results.every(Boolean);
  }

  return NextResponse.json({ success: true, data: toPublicProfile(updated), backendSynced });
}
