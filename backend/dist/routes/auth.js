"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const jwt_1 = require("../lib/jwt");
const creatorService_1 = require("../services/creatorService");
const promoService_1 = require("../services/promoService");
const router = (0, express_1.Router)();
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    instagram_url: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    youtube_url: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    tiktok_url: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    twitter_url: zod_1.z.string().url().optional().or(zod_1.z.literal("")),
    niche: zod_1.z.string().max(100).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// POST /api/creator/auth/signup
router.post("/signup", async (req, res) => {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { name, email, password, instagram_url, youtube_url, tiktok_url, twitter_url, niche } = result.data;
    const existing = await (0, creatorService_1.findCreatorByEmail)(email);
    if (existing) {
        res.status(409).json({ success: false, error: "Email already registered" });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const creator = await (0, creatorService_1.createCreator)({
        name,
        email,
        passwordHash,
        instagramUrl: instagram_url || undefined,
        youtubeUrl: youtube_url || undefined,
        tiktokUrl: tiktok_url || undefined,
        twitterUrl: twitter_url || undefined,
        niche,
    });
    const promoCode = await (0, promoService_1.createPromoCode)(creator.id, name);
    const accessToken = (0, jwt_1.signAccessToken)({ sub: creator.id, email: creator.email });
    const refreshToken = (0, jwt_1.signRefreshToken)(creator.id);
    res.status(201).json({
        success: true,
        data: {
            creator: (0, creatorService_1.toPublicProfile)(creator),
            promo_code: promoCode.code,
            access_token: accessToken,
            refresh_token: refreshToken,
        },
    });
});
// POST /api/creator/auth/login
router.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { email, password } = result.data;
    const creator = await (0, creatorService_1.findCreatorByEmail)(email);
    if (!creator || !(await bcryptjs_1.default.compare(password, creator.password_hash))) {
        res.status(401).json({ success: false, error: "Invalid email or password" });
        return;
    }
    if (creator.status === "suspended") {
        res.status(403).json({ success: false, error: "Account suspended. Contact support." });
        return;
    }
    const promoCode = await (0, promoService_1.getPromoCodeByCreator)(creator.id);
    const accessToken = (0, jwt_1.signAccessToken)({ sub: creator.id, email: creator.email });
    const refreshToken = (0, jwt_1.signRefreshToken)(creator.id);
    res.json({
        success: true,
        data: {
            creator: (0, creatorService_1.toPublicProfile)(creator),
            promo_code: promoCode?.code ?? null,
            access_token: accessToken,
            refresh_token: refreshToken,
        },
    });
});
// POST /api/creator/auth/refresh
router.post("/refresh", async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) {
        res.status(400).json({ success: false, error: "Missing refresh_token" });
        return;
    }
    try {
        const payload = (0, jwt_1.verifyRefreshToken)(refresh_token);
        const creator = await (0, creatorService_1.findCreatorById)(payload.sub);
        if (!creator) {
            res.status(401).json({ success: false, error: "Creator not found" });
            return;
        }
        const accessToken = (0, jwt_1.signAccessToken)({ sub: creator.id, email: creator.email });
        res.json({ success: true, data: { access_token: accessToken } });
    }
    catch {
        res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map