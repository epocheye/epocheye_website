import { Router, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { AuthRequest, ContentSubmission } from "../types";

const router = Router();

const submitSchema = z.object({
  content_url: z.string().url(),
  platform: z.enum(["instagram", "youtube", "tiktok", "twitter", "blog", "other"]),
  title: z.string().max(200).optional(),
});

// GET /api/creator/content
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("creator_id", req.creator!.sub)
    .order("submitted_at", { ascending: false });

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }

  res.json({ success: true, data: data as ContentSubmission[] });
});

// POST /api/creator/content
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = submitSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { content_url, platform, title } = result.data;

  const { data, error } = await supabase
    .from("content_submissions")
    .insert({
      creator_id: req.creator!.sub,
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

  res.status(201).json({ success: true, data: data as ContentSubmission });
});

// DELETE /api/creator/content/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Verify ownership
  const { data: existing } = await supabase
    .from("content_submissions")
    .select("id, creator_id, status")
    .eq("id", id)
    .single();

  if (!existing || existing.creator_id !== req.creator!.sub) {
    res.status(404).json({ success: false, error: "Content not found" });
    return;
  }

  if (existing.status !== "pending") {
    res.status(400).json({ success: false, error: "Only pending submissions can be deleted" });
    return;
  }

  await supabase.from("content_submissions").delete().eq("id", id);
  res.json({ success: true, message: "Deleted" });
});

export default router;
