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

  // Support both:
  //  - New backend webhook format: { coupon_code, creator_id, customer_user_id, original_amount, discount_amount, final_amount }
  //  - Legacy format:              { code, customer_id, plan_amount, currency }
  const isBackendWebhook = !!body?.coupon_code;

  if (isBackendWebhook) {
    return handleBackendOrderWebhook(body);
  }
  return handleLegacyWebhook(body);
}

/**
 * Called by the Go backend after recording a coupon order in the app.
 * Body: { coupon_code, creator_id, customer_user_id, razorpay_payment_id,
 *         original_amount, discount_amount, final_amount, recorded_at }
 * All amounts are in paise (INR).
 */
async function handleBackendOrderWebhook(body) {
  const couponCode = String(body?.coupon_code || "").trim().toUpperCase();
  const creatorId = String(body?.creator_id || "").trim();
  const customerUserId = String(body?.customer_user_id || "").trim();
  const originalAmount = Number(body?.original_amount); // paise
  const discountAmount = Number(body?.discount_amount); // paise
  const finalAmount = Number(body?.final_amount);       // paise

  if (!couponCode || !creatorId || !Number.isFinite(finalAmount) || finalAmount <= 0) {
    return NextResponse.json(
      { success: false, error: "coupon_code, creator_id, and positive final_amount are required" },
      { status: 400 }
    );
  }

  // creator_id is the website creators.id the coupon was synced under. Older
  // coupons made through the creators app used a different id, so fall back to
  // the owner of the promo code.
  let creator = await findCreatorById(creatorId).catch(() => null);
  if (!creator) {
    const promo = await getPromoCodeByCode(couponCode);
    if (promo) creator = await findCreatorById(promo.creator_id);
  }
  if (!creator) {
    return NextResponse.json({ success: false, error: "Creator not found" }, { status: 404 });
  }

  // Commission base is the LIST price (the pre-discount original amount), so a
  // bigger customer discount never lowers the creator's earnings. Amounts from
  // the backend are paise — convert to rupees.
  const listPaise =
    Number.isFinite(originalAmount) && originalAmount >= finalAmount ? originalAmount : finalAmount;
  const planAmountInr = Number((listPaise / 100).toFixed(2));
  const discountInr = Number.isFinite(discountAmount) && discountAmount >= 0
    ? Number((discountAmount / 100).toFixed(2))
    : undefined;

  // Rate comes from the creator's sales tier (see lib/server/creatorProgram.js).
  const { commissionAmount, commissionRate } = await recordConversion({
    code: couponCode,
    creatorId: creator.id,
    customerId: customerUserId,
    planAmount: planAmountInr,
    customerDiscountRate: Number(creator.customer_discount),
    discountAmount: discountInr,
    // The sale's site, so a creator's sales at their assigned monument count
    // towards renewing their window.
    siteSlug: Array.isArray(body?.place_ids) && body.place_ids.length ? String(body.place_ids[0]) : null,
  });

  return NextResponse.json({
    success: true,
    data: { commission_amount: commissionAmount, commission_rate: commissionRate },
  });
}

/**
 * Legacy webhook format used by older integrations.
 * Body: { code, customer_id, plan_amount, currency }
 */
async function handleLegacyWebhook(body) {
  const code = String(body?.code || "").trim().toUpperCase();
  const customerId = String(body?.customer_id || "").trim();
  const planAmount = Number(body?.plan_amount);

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
  });

  const discountAmount = Number(
    ((planAmount * Number(creator.customer_discount)) / 100).toFixed(2)
  );

  return NextResponse.json({
    success: true,
    data: { discount_amount: discountAmount },
  });
}
