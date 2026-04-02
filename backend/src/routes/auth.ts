import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import {
  findCreatorByEmail,
  findCreatorById,
  createCreator,
  toPublicProfile,
} from "../services/creatorService";
import { createPromoCode, getPromoCodeByCreator } from "../services/promoService";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  instagram_url: z.string().url().optional().or(z.literal("")),
  youtube_url: z.string().url().optional().or(z.literal("")),
  tiktok_url: z.string().url().optional().or(z.literal("")),
  twitter_url: z.string().url().optional().or(z.literal("")),
  niche: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/creator/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  const result = signupSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { name, email, password, instagram_url, youtube_url, tiktok_url, twitter_url, niche } =
    result.data;

  const existing = await findCreatorByEmail(email);
  if (existing) {
    res.status(409).json({ success: false, error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const creator = await createCreator({
    name,
    email,
    passwordHash,
    instagramUrl: instagram_url || undefined,
    youtubeUrl: youtube_url || undefined,
    tiktokUrl: tiktok_url || undefined,
    twitterUrl: twitter_url || undefined,
    niche,
  });

  const promoCode = await createPromoCode(creator.id, name);

  const accessToken = signAccessToken({ sub: creator.id, email: creator.email });
  const refreshToken = signRefreshToken(creator.id);

  res.status(201).json({
    success: true,
    data: {
      creator: toPublicProfile(creator),
      promo_code: promoCode.code,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

// POST /api/creator/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error.issues[0].message });
    return;
  }

  const { email, password } = result.data;
  const creator = await findCreatorByEmail(email);

  if (!creator || !(await bcrypt.compare(password, creator.password_hash))) {
    res.status(401).json({ success: false, error: "Invalid email or password" });
    return;
  }

  if (creator.status === "suspended") {
    res.status(403).json({ success: false, error: "Account suspended. Contact support." });
    return;
  }

  const promoCode = await getPromoCodeByCreator(creator.id);
  const accessToken = signAccessToken({ sub: creator.id, email: creator.email });
  const refreshToken = signRefreshToken(creator.id);

  res.json({
    success: true,
    data: {
      creator: toPublicProfile(creator),
      promo_code: promoCode?.code ?? null,
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
});

// POST /api/creator/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    res.status(400).json({ success: false, error: "Missing refresh_token" });
    return;
  }

  try {
    const payload = verifyRefreshToken(refresh_token);
    const creator = await findCreatorById(payload.sub);
    if (!creator) {
      res.status(401).json({ success: false, error: "Creator not found" });
      return;
    }

    const accessToken = signAccessToken({ sub: creator.id, email: creator.email });
    res.json({ success: true, data: { access_token: accessToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

export default router;
