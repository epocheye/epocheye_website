import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import {
  getPromoCodeByCreator,
  getPromoCodeByCode,
  recordClick,
  recordConversion,
} from "../services/promoService";
import { findCreatorById } from "../services/creatorService";
import { AuthRequest } from "../types";

const router = Router();

const clickSchema = z.object({
  code: z.string().min(3).max(20),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

const redeemSchema = z.object({
  code: z.string().min(3).max(20),
  customer_id: z.string(),
  plan_amount: z.number().positive(),
  currency: z.string().length(3).optional(),
});

// GET /api/creator/promo — get own promo code
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const promo = await getPromoCodeByCreator(req.creator!.sub);
  if (!promo) {
    res.status(404).json({ success: false, error: "No promo code found" });
    return;
  }
  res.json({ success: true, data: promo });
});

// POST /api/creator/promo/click — record a link click (public, called by /r/[code] route)
router.post("/click", async (req: Request, res: Response) => {
  const result = clickSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { code, ip_address, user_agent } = result.data;
  const promo = await getPromoCodeByCode(code);

  await recordClick({
    code,
    creatorId: promo?.creator_id ?? null,
    ipAddress: ip_address ?? (req.headers["x-forwarded-for"] as string) ?? req.ip,
    userAgent: user_agent ?? req.headers["user-agent"],
  });

  // Return discount info so the referral link landing page can display it
  if (promo) {
    const creator = await findCreatorById(promo.creator_id);
    res.json({
      success: true,
      data: {
        valid: true,
        customer_discount: creator?.customer_discount ?? 10,
      },
    });
  } else {
    res.json({ success: true, data: { valid: false } });
  }
});

// POST /api/creator/promo/validate — validate a promo code (public, for mobile app checkout)
router.post("/validate", async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ success: false, error: "code is required" });
    return;
  }

  const promo = await getPromoCodeByCode(String(code));
  if (!promo) {
    res.status(404).json({ success: false, error: "Invalid or inactive promo code" });
    return;
  }

  const creator = await findCreatorById(promo.creator_id);
  res.json({
    success: true,
    data: {
      code: promo.code,
      customer_discount: creator?.customer_discount ?? 10,
    },
  });
});

// POST /api/creator/promo/redeem — record a conversion (called by mobile app backend)
// Protected by X-Webhook-Secret header
router.post("/redeem", async (req: Request, res: Response) => {
  const webhookSecret = req.headers["x-webhook-secret"];
  if (!webhookSecret || webhookSecret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ success: false, error: "Invalid webhook secret" });
    return;
  }

  const result = redeemSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { code, customer_id, plan_amount, currency } = result.data;
  const promo = await getPromoCodeByCode(code);

  if (!promo) {
    res.status(404).json({ success: false, error: "Invalid promo code" });
    return;
  }

  const creator = await findCreatorById(promo.creator_id);
  if (!creator) {
    res.status(404).json({ success: false, error: "Creator not found" });
    return;
  }

  await recordConversion({
    code,
    creatorId: creator.id,
    customerId: customer_id,
    planAmount: plan_amount,
    commissionRate: Number(creator.commission_rate),
    customerDiscountRate: Number(creator.customer_discount),
    currency,
  });

  const discountAmount = parseFloat(
    ((plan_amount * Number(creator.customer_discount)) / 100).toFixed(2)
  );

  res.json({
    success: true,
    data: {
      discount_amount: discountAmount,
      currency: currency ?? "USD",
    },
  });
});

export default router;
