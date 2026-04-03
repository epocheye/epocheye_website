import { NextResponse } from "next/server";

import { validateWebhookSecret } from "@/lib/server/creatorAuth";
import {
  findCreatorById,
  getPromoCodeByCode,
  recordConversion,
} from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST(request) {
  const webhookCheck = validateWebhookSecret(request);
  if (!webhookCheck.ok) {
    return NextResponse.json(
      { success: false, error: webhookCheck.message },
      { status: webhookCheck.status }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const code = String(body?.code || "").trim().toUpperCase();
  const customerId = String(body?.customer_id || "").trim();
  const planAmount = Number(body?.plan_amount);
  const currency = body?.currency ? String(body.currency).toUpperCase() : "USD";

  if (!code || !customerId || !Number.isFinite(planAmount) || planAmount <= 0) {
    return NextResponse.json(
      { success: false, error: "code, customer_id, and positive plan_amount are required" },
      { status: 400 }
    );
  }

  const promo = await getPromoCodeByCode(code);
  if (!promo) {
    return NextResponse.json({ success: false, error: "Invalid promo code" }, { status: 404 });
  }

  const creator = await findCreatorById(promo.creator_id);
  if (!creator) {
    return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
  }

  await recordConversion({
    code,
    creatorId: creator.id,
    customerId,
    planAmount,
    commissionRate: Number(creator.commission_rate),
    customerDiscountRate: Number(creator.customer_discount),
    currency,
  });

  const discountAmount = Number(
    ((planAmount * Number(creator.customer_discount)) / 100).toFixed(2)
  );

  return NextResponse.json({
    success: true,
    data: {
      discount_amount: discountAmount,
      currency,
    },
  });
}
