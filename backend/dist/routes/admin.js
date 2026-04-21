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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const adminAuth_1 = require("../middleware/adminAuth");
const creatorService_1 = require("../services/creatorService");
const payoutService_1 = require("../services/payoutService");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
const uuidSchema = zod_1.z.string().uuid();
function parseUuidParam(req, res) {
    const parsed = uuidSchema.safeParse(req.params["id"]);
    if (!parsed.success) {
        res.status(400).json({ success: false, error: "Invalid id" });
        return null;
    }
    return parsed.data;
}
const updateCreatorSchema = zod_1.z.object({
    commission_rate: zod_1.z.number().min(5).max(20).optional(),
    customer_discount: zod_1.z.number().min(0).max(30).optional(),
    status: zod_1.z.enum(["active", "suspended"]).optional(),
});
const updatePayoutSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "processing", "completed", "failed"]),
});
const updateContentSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "approved", "rejected"]),
    admin_notes: zod_1.z.string().max(500).optional(),
});
// GET /api/admin/creators
router.get("/creators", adminAuth_1.requireAdmin, async (_req, res) => {
    const creators = await (0, creatorService_1.listAllCreators)();
    res.json({ success: true, data: creators.map(creatorService_1.toPublicProfile) });
});
// GET /api/admin/creators/:id
router.get("/creators/:id", adminAuth_1.requireAdmin, async (req, res) => {
    const id = parseUuidParam(req, res);
    if (!id)
        return;
    const { findCreatorById } = await Promise.resolve().then(() => __importStar(require("../services/creatorService")));
    const creator = await findCreatorById(id);
    if (!creator) {
        res.status(404).json({ success: false, error: "Creator not found" });
        return;
    }
    res.json({ success: true, data: (0, creatorService_1.toPublicProfile)(creator) });
});
// PUT /api/admin/creators/:id
router.put("/creators/:id", adminAuth_1.requireAdmin, async (req, res) => {
    const id = parseUuidParam(req, res);
    if (!id)
        return;
    const result = updateCreatorSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const updated = await (0, creatorService_1.updateCreator)(id, result.data);
    res.json({ success: true, data: (0, creatorService_1.toPublicProfile)(updated) });
});
// GET /api/admin/payouts
router.get("/payouts", adminAuth_1.requireAdmin, async (_req, res) => {
    const payouts = await (0, payoutService_1.listAllPayouts)();
    res.json({ success: true, data: payouts });
});
// PUT /api/admin/payouts/:id
router.put("/payouts/:id", adminAuth_1.requireAdmin, async (req, res) => {
    const id = parseUuidParam(req, res);
    if (!id)
        return;
    const result = updatePayoutSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    await (0, payoutService_1.updatePayoutStatus)(id, result.data.status);
    res.json({ success: true, message: "Payout updated" });
});
// GET /api/admin/content
router.get("/content", adminAuth_1.requireAdmin, async (_req, res) => {
    const { data, error } = await supabase_1.supabase
        .from("content_submissions")
        .select("*, creators(name, email)")
        .order("submitted_at", { ascending: false });
    if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
    }
    res.json({ success: true, data });
});
// PUT /api/admin/content/:id
router.put("/content/:id", adminAuth_1.requireAdmin, async (req, res) => {
    const id = parseUuidParam(req, res);
    if (!id)
        return;
    const result = updateContentSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const updates = { status: result.data.status };
    if (result.data.admin_notes !== undefined)
        updates.admin_notes = result.data.admin_notes;
    if (result.data.status !== "pending")
        updates.reviewed_at = new Date().toISOString();
    await supabase_1.supabase.from("content_submissions").update(updates).eq("id", id);
    res.json({ success: true, message: "Content updated" });
});
exports.default = router;
//# sourceMappingURL=admin.js.map