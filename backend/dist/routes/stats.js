"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const statsService_1 = require("../services/statsService");
const router = (0, express_1.Router)();
// GET /api/creator/stats/overview
router.get("/overview", auth_1.requireAuth, async (req, res) => {
    const overview = await (0, statsService_1.getStatsOverview)(req.creator.sub);
    res.json({ success: true, data: overview });
});
// GET /api/creator/stats/timeline?days=30
router.get("/timeline", auth_1.requireAuth, async (req, res) => {
    const days = Math.min(90, Math.max(7, parseInt(String(req.query.days ?? "30"))));
    const timeline = await (0, statsService_1.getStatsTimeline)(req.creator.sub, days);
    res.json({ success: true, data: timeline });
});
exports.default = router;
//# sourceMappingURL=stats.js.map