import { Router, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getStatsOverview, getStatsTimeline } from "../services/statsService";
import { AuthRequest } from "../types";

const router = Router();

// GET /api/creator/stats/overview
router.get("/overview", requireAuth, async (req: AuthRequest, res: Response) => {
  const overview = await getStatsOverview(req.creator!.sub);
  res.json({ success: true, data: overview });
});

// GET /api/creator/stats/timeline?days=30
router.get("/timeline", requireAuth, async (req: AuthRequest, res: Response) => {
  const days = Math.min(90, Math.max(7, parseInt(String(req.query.days ?? "30"))));
  const timeline = await getStatsTimeline(req.creator!.sub, days);
  res.json({ success: true, data: timeline });
});

export default router;
