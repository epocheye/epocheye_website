import { Router, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { findCreatorById } from "../services/creatorService";
import {
  getAdminSettings,
  getAvailableBalance,
  requestPayout,
  listPayouts,
} from "../services/payoutService";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/creator/payouts
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const [payouts, balance, settings] = await Promise.all([
    listPayouts(req.creator!.sub),
    getAvailableBalance(req.creator!.sub),
    getAdminSettings(),
  ]);
  res.json({
    success: true,
    data: { payouts, available_balance: balance, min_payout_inr: settings.min_payout_inr },
  });
});

// GET /api/creator/payouts/balance
router.get("/balance", requireAuth, async (req: AuthRequest, res: Response) => {
  const [balance, settings] = await Promise.all([
    getAvailableBalance(req.creator!.sub),
    getAdminSettings(),
  ]);
  res.json({ success: true, data: { available_balance: balance, min_payout_inr: settings.min_payout_inr } });
});

// POST /api/creator/payouts/request
router.post("/request", requireAuth, async (req: AuthRequest, res: Response) => {
  const creator = await findCreatorById(req.creator!.sub);
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
    const payout = await requestPayout({
      creatorId: creator.id,
      upiId: creator.upi_id,
      creatorName: creator.name,
    });
    res.status(201).json({ success: true, data: payout });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
