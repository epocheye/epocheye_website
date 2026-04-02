import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import statsRoutes from "./routes/stats";
import promoRoutes from "./routes/promo";
import contentRoutes from "./routes/content";
import payoutsRoutes from "./routes/payouts";
import adminRoutes from "./routes/admin";

const app = express();

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());

const corsOrigin = process.env.CORS_ORIGIN ?? "https://epocheye.app";
app.use(
  cors({
    origin: [corsOrigin, "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key", "X-Webhook-Secret"],
    credentials: false,
  })
);

// Rate limiting — stricter on auth routes
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.use(globalLimiter);
app.use(express.json({ limit: "100kb" }));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/creator/auth", authLimiter, authRoutes);
app.use("/api/creator", profileRoutes);
app.use("/api/creator/stats", statsRoutes);
app.use("/api/creator/promo", promoRoutes);
app.use("/api/creator/content", contentRoutes);
app.use("/api/creator/payouts", payoutsRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "epocheye-creator-backend" });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

export default app;
