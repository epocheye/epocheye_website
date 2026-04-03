"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const profile_1 = __importDefault(require("./routes/profile"));
const stats_1 = __importDefault(require("./routes/stats"));
const promo_1 = __importDefault(require("./routes/promo"));
const content_1 = __importDefault(require("./routes/content"));
const payouts_1 = __importDefault(require("./routes/payouts"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
// ─── Security middleware ───────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
const corsOrigin = process.env.CORS_ORIGIN ?? "https://epocheye.app";
app.use((0, cors_1.default)({
    origin: [corsOrigin, "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key", "X-Webhook-Secret"],
    credentials: false,
}));
// Rate limiting — stricter on auth routes
const globalLimiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(globalLimiter);
app.use(express_1.default.json({ limit: "100kb" }));
// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/creator", profile_1.default);
app.use("/api/creator/stats", stats_1.default);
app.use("/api/creator/promo", promo_1.default);
app.use("/api/creator/content", content_1.default);
app.use("/api/creator/payouts", payouts_1.default);
app.use("/api/admin", admin_1.default);
// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "epocheye-creator-backend" });
});
// 404 fallback
app.use((_req, res) => {
    res.status(404).json({ success: false, error: "Not found" });
});
exports.default = app;
//# sourceMappingURL=app.js.map