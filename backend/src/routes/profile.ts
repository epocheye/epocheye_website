import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { findCreatorById, updateCreator, toPublicProfile } from "../services/creatorService";
import { AuthRequest } from "../types";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  instagram_url: z.string().url().nullable().optional(),
  youtube_url: z.string().url().nullable().optional(),
  tiktok_url: z.string().url().nullable().optional(),
  twitter_url: z.string().url().nullable().optional(),
  niche: z.string().max(100).nullable().optional(),
});

const updatePaymentSchema = z.object({
  upi_id: z.string().min(5).max(100),
});

const changePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8),
});

// GET /api/creator/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const creator = await findCreatorById(req.creator!.sub);
  if (!creator) {
    res.status(404).json({ success: false, error: "Creator not found" });
    return;
  }
  res.json({ success: true, data: toPublicProfile(creator) });
});

// PUT /api/creator/me
router.put("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = updateProfileSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const updated = await updateCreator(req.creator!.sub, result.data);
  res.json({ success: true, data: toPublicProfile(updated) });
});

// PUT /api/creator/me/payment
router.put("/me/payment", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = updatePaymentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const updated = await updateCreator(req.creator!.sub, { upi_id: result.data.upi_id });
  res.json({ success: true, data: toPublicProfile(updated) });
});

// PUT /api/creator/me/password
router.put("/me/password", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = changePasswordSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { findCreatorByEmail } = await import("../services/creatorService");
  const creator = await findCreatorById(req.creator!.sub);
  if (!creator) {
    res.status(404).json({ success: false, error: "Creator not found" });
    return;
  }

  const valid = await bcrypt.compare(result.data.current_password, creator.password_hash);
  if (!valid) {
    res.status(401).json({ success: false, error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(result.data.new_password, 12);
  const { supabase } = await import("../lib/supabase");
  await supabase.from("creators").update({ password_hash: newHash }).eq("id", creator.id);

  res.json({ success: true, message: "Password updated" });
});

export default router;
