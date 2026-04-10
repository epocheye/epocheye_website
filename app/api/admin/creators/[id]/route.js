import { NextResponse } from "next/server";

import { verifyAdminJWTFromRequest } from "@/lib/server/adminAuth";
import {
  findCreatorById,
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
    const customerDiscount = Number(body.customer_discount);
    if (!Number.isFinite(customerDiscount) || customerDiscount < 0 || customerDiscount > 30) {
      return NextResponse.json(
        { success: false, error: "customer_discount must be between 0 and 30" },
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

  return NextResponse.json({ success: true, data: toPublicProfile(updated) });
}
