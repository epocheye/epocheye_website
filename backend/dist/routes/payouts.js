"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const creatorService_1 = require("../services/creatorService");
const payoutService_1 = require("../services/payoutService");
const router = (0, express_1.Router)();
// GET /api/creator/payouts
router.get("/", auth_1.requireAuth, async (req, res) => {
    const [payouts, balance] = await Promise.all([
        (0, payoutService_1.listPayouts)(req.creator.sub),
        (0, payoutService_1.getAvailableBalance)(req.creator.sub),
    ]);
    res.json({ success: true, data: { payouts, available_balance: balance } });
});
// GET /api/creator/payouts/balance
router.get("/balance", auth_1.requireAuth, async (req, res) => {
    const balance = await (0, payoutService_1.getAvailableBalance)(req.creator.sub);
    res.json({ success: true, data: { available_balance: balance } });
});
// POST /api/creator/payouts/request
router.post("/request", auth_1.requireAuth, async (req, res) => {
    const creator = await (0, creatorService_1.findCreatorById)(req.creator.sub);
    if (!creator) {
        res.status(404).json({ success: false, error: "Creator not found" });
        return;
    }
    if (!creator.upi_id) {
        res.status(400).json({
            success: false,
            error: "Please add your UPI ID in Settings before requesting a payout.",
        });
        return;
    }
    try {
        const payout = await (0, payoutService_1.requestPayout)({
            creatorId: creator.id,
            upiId: creator.upi_id,
            creatorName: creator.name,
        });
        res.status(201).json({ success: true, data: payout });
    }
    catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=payouts.js.map