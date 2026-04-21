"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = require("node:crypto");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const clickLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many requests" },
});
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(ab, bb);
}
const promoService_1 = require("../services/promoService");
const creatorService_1 = require("../services/creatorService");
const router = (0, express_1.Router)();
const clickSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(20),
    ip_address: zod_1.z.string().optional(),
    user_agent: zod_1.z.string().optional(),
});
const redeemSchema = zod_1.z.object({
    code: zod_1.z.string().min(3).max(20),
    customer_id: zod_1.z.string(),
    plan_amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3).optional(),
});
// GET /api/creator/promo — get own promo code
router.get("/", auth_1.requireAuth, async (req, res) => {
    const promo = await (0, promoService_1.getPromoCodeByCreator)(req.creator.sub);
    if (!promo) {
        res.status(404).json({ success: false, error: "No promo code found" });
        return;
    }
    res.json({ success: true, data: promo });
});
// POST /api/creator/promo/click — record a link click (public, called by /r/[code] route)
router.post("/click", clickLimiter, async (req, res) => {
    const result = clickSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { code, ip_address, user_agent } = result.data;
    const promo = await (0, promoService_1.getPromoCodeByCode)(code);
    await (0, promoService_1.recordClick)({
        code,
        creatorId: promo?.creator_id ?? null,
        ipAddress: ip_address ?? req.headers["x-forwarded-for"] ?? req.ip,
        userAgent: user_agent ?? req.headers["user-agent"],
    });
    // Return discount info so the referral link landing page can display it
    if (promo) {
        const creator = await (0, creatorService_1.findCreatorById)(promo.creator_id);
        res.json({
            success: true,
            data: {
                valid: true,
                customer_discount: creator?.customer_discount ?? 10,
            },
        });
    }
    else {
        res.json({ success: true, data: { valid: false } });
    }
});
// POST /api/creator/promo/validate — validate a promo code (public, for mobile app checkout)
router.post("/validate", async (req, res) => {
    const { code } = req.body;
    if (!code) {
        res.status(400).json({ success: false, error: "code is required" });
        return;
    }
    const promo = await (0, promoService_1.getPromoCodeByCode)(String(code));
    if (!promo) {
        res.status(404).json({ success: false, error: "Invalid or inactive promo code" });
        return;
    }
    const creator = await (0, creatorService_1.findCreatorById)(promo.creator_id);
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
router.post("/redeem", async (req, res) => {
    const webhookSecret = req.headers["x-webhook-secret"];
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret) {
        res.status(500).json({ success: false, error: "Webhook secret not configured" });
        return;
    }
    if (typeof webhookSecret !== "string" || !safeEqual(webhookSecret, expectedSecret)) {
        res.status(401).json({ success: false, error: "Invalid webhook secret" });
        return;
    }
    const result = redeemSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { code, customer_id, plan_amount, currency } = result.data;
    const promo = await (0, promoService_1.getPromoCodeByCode)(code);
    if (!promo) {
        res.status(404).json({ success: false, error: "Invalid promo code" });
        return;
    }
    const creator = await (0, creatorService_1.findCreatorById)(promo.creator_id);
    if (!creator) {
        res.status(404).json({ success: false, error: "Creator not found" });
        return;
    }
    await (0, promoService_1.recordConversion)({
        code,
        creatorId: creator.id,
        customerId: customer_id,
        planAmount: plan_amount,
        commissionRate: Number(creator.commission_rate),
        customerDiscountRate: Number(creator.customer_discount),
        currency,
    });
    const discountAmount = parseFloat(((plan_amount * Number(creator.customer_discount)) / 100).toFixed(2));
    res.json({
        success: true,
        data: {
            discount_amount: discountAmount,
            currency: currency ?? "USD",
        },
    });
});
exports.default = router;
//# sourceMappingURL=promo.js.map