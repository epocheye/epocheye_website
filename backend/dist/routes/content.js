"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
const submitSchema = zod_1.z.object({
    content_url: zod_1.z.string().url(),
    platform: zod_1.z.enum(["instagram", "youtube", "tiktok", "twitter", "blog", "other"]),
    title: zod_1.z.string().max(200).optional(),
});
// GET /api/creator/content
router.get("/", auth_1.requireAuth, async (req, res) => {
    const { data, error } = await supabase_1.supabase
        .from("content_submissions")
        .select("*")
        .eq("creator_id", req.creator.sub)
        .order("submitted_at", { ascending: false });
    if (error) {
        res.status(500).json({ success: false, error: error.message });
        return;
    }
    res.json({ success: true, data: data });
});
// POST /api/creator/content
router.post("/", auth_1.requireAuth, async (req, res) => {
    const result = submitSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({ success: false, error: result.error.issues[0].message });
        return;
    }
    const { content_url, platform, title } = result.data;
    const { data, error } = await supabase_1.supabase
        .from("content_submissions")
        .insert({
        creator_id: req.creator.sub,
        content_url,
        platform,
        title: title ?? null,
    })
        .select()
        .single();
    if (error || !data) {
        res.status(500).json({ success: false, error: error?.message ?? "Failed to submit" });
        return;
    }
    res.status(201).json({ success: true, data: data });
});
// DELETE /api/creator/content/:id
router.delete("/:id", auth_1.requireAuth, async (req, res) => {
    const { id } = req.params;
    // Verify ownership
    const { data: existing } = await supabase_1.supabase
        .from("content_submissions")
        .select("id, creator_id, status")
        .eq("id", id)
        .single();
    if (!existing || existing.creator_id !== req.creator.sub) {
        res.status(404).json({ success: false, error: "Content not found" });
        return;
    }
    if (existing.status !== "pending") {
        res.status(400).json({ success: false, error: "Only pending submissions can be deleted" });
        return;
    }
    await supabase_1.supabase.from("content_submissions").delete().eq("id", id);
    res.json({ success: true, message: "Deleted" });
});
exports.default = router;
//# sourceMappingURL=content.js.map