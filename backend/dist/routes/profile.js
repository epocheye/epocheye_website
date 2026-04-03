"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const creatorService_1 = require("../services/creatorService");
const router = (0, express_1.Router)();
const updateProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    instagram_url: zod_1.z.string().url().nullable().optional(),
    youtube_url: zod_1.z.string().url().nullable().optional(),
    tiktok_url: zod_1.z.string().url().nullable().optional(),
    twitter_url: zod_1.z.string().url().nullable().optional(),
    niche: zod_1.z.string().max(100).nullable().optional(),
});
const updatePaymentSchema = zod_1.z.object({
    upi_id: zod_1.z.string().min(5).max(100),
});
const changePasswordSchema = zod_1.z.object({
    current_password: zod_1.z.string(),
    new_password: zod_1.z.string().min(8),
});
// GET /api/creator/me
router.get("/me", auth_1.requireAuth, async (req, res) => {
    const creator = await (0, creatorService_1.findCreatorById)(req.creator.sub);
    if (!creator) {
        res.status(404).json({ success: false, error: "Creator not found" });
        return;
    }
    res.json({ success: true, data: (0, creatorService_1.toPublicProfile)(creator) });
});
// PUT /api/creator/me
router.put("/me", auth_1.requireAuth, async (req, res) => {
    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const updated = await (0, creatorService_1.updateCreator)(req.creator.sub, result.data);
    res.json({ success: true, data: (0, creatorService_1.toPublicProfile)(updated) });
});
// PUT /api/creator/me/payment
router.put("/me/payment", auth_1.requireAuth, async (req, res) => {
    const result = updatePaymentSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const updated = await (0, creatorService_1.updateCreator)(req.creator.sub, { upi_id: result.data.upi_id });
    res.json({ success: true, data: (0, creatorService_1.toPublicProfile)(updated) });
});
// PUT /api/creator/me/password
router.put("/me/password", auth_1.requireAuth, async (req, res) => {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { findCreatorByEmail } = await Promise.resolve().then(() => __importStar(require("../services/creatorService")));
    const creator = await (0, creatorService_1.findCreatorById)(req.creator.sub);
    if (!creator) {
        res.status(404).json({ success: false, error: "Creator not found" });
        return;
    }
    const valid = await bcryptjs_1.default.compare(result.data.current_password, creator.password_hash);
    if (!valid) {
        res.status(401).json({ success: false, error: "Current password is incorrect" });
        return;
    }
    const newHash = await bcryptjs_1.default.hash(result.data.new_password, 12);
    const { supabase } = await Promise.resolve().then(() => __importStar(require("../lib/supabase")));
    await supabase.from("creators").update({ password_hash: newHash }).eq("id", creator.id);
    res.json({ success: true, message: "Password updated" });
});
exports.default = router;
//# sourceMappingURL=profile.js.map