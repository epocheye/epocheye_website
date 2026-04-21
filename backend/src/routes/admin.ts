import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/adminAuth";
import { listAllCreators, updateCreator, toPublicProfile } from "../services/creatorService";
import { listAllPayouts, updatePayoutStatus } from "../services/payoutService";
import { supabase } from "../lib/supabase";
import { ContentSubmission } from "../types";

const router = Router();

const uuidSchema = z.string().uuid();

function parseUuidParam(req: Request, res: Response): string | null {
  const parsed = uuidSchema.safeParse(req.params["id"]);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid id" });
    return null;
  }
  return parsed.data;
}

const updateCreatorSchema = z.object({
  commission_rate: z.number().min(5).max(20).optional(),
  customer_discount: z.number().min(0).max(30).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

const updatePayoutSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "failed"]),
});

const updateContentSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  admin_notes: z.string().max(500).optional(),
});

// GET /api/admin/creators
router.get("/creators", requireAdmin, async (_req: Request, res: Response) => {
  const creators = await listAllCreators();
  res.json({ success: true, data: creators.map(toPublicProfile) });
});

// GET /api/admin/creators/:id
router.get("/creators/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseUuidParam(req, res);
  if (!id) return;
  const { findCreatorById } = await import("../services/creatorService");
  const creator = await findCreatorById(id);
  if (!creator) {
    res.status(404).json({ success: false, error: "Creator not found" });
    return;
  }
  res.json({ success: true, data: toPublicProfile(creator) });
});

// PUT /api/admin/creators/:id
router.put("/creators/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseUuidParam(req, res);
  if (!id) return;
  const result = updateCreatorSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const updated = await updateCreator(id, result.data);
  res.json({ success: true, data: toPublicProfile(updated) });
});

// GET /api/admin/payouts
router.get("/payouts", requireAdmin, async (_req: Request, res: Response) => {
  const payouts = await listAllPayouts();
  res.json({ success: true, data: payouts });
});

// PUT /api/admin/payouts/:id
router.put("/payouts/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseUuidParam(req, res);
  if (!id) return;
  const result = updatePayoutSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  await updatePayoutStatus(id, result.data.status);
  res.json({ success: true, message: "Payout updated" });
});

// GET /api/admin/content
router.get("/content", requireAdmin, async (_req: Request, res: Response) => {
  const { data, error } = await supabase
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
router.put("/content/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseUuidParam(req, res);
  if (!id) return;
  const result = updateContentSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const updates: Record<string, unknown> = { status: result.data.status };
  if (result.data.admin_notes !== undefined) updates.admin_notes = result.data.admin_notes;
  if (result.data.status !== "pending") updates.reviewed_at = new Date().toISOString();

  await supabase.from("content_submissions").update(updates).eq("id", id);
  res.json({ success: true, message: "Content updated" });
});

export default router;
