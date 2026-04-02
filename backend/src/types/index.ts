import { Request } from "express";

// ─── Database row types ───────────────────────────────────────────────────────

export interface Creator {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  niche: string | null;
  commission_rate: number;
  customer_discount: number;
  upi_id: string | null;
  status: "active" | "suspended";
  created_at: string;
}

export interface PromoCode {
  id: string;
  creator_id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface ReferralClick {
  id: string;
  code: string;
  creator_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  clicked_at: string;
}

export interface ReferralConversion {
  id: string;
  code: string;
  creator_id: string | null;
  customer_id: string | null;
  plan_amount: number;
  commission_amount: number;
  discount_amount: number;
  currency: string;
  status: "pending" | "confirmed" | "paid";
  converted_at: string;
}

export interface ContentSubmission {
  id: string;
  creator_id: string;
  content_url: string;
  platform: "instagram" | "youtube" | "tiktok" | "twitter" | "blog" | "other";
  title: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface PayoutRequest {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  upi_id: string | null;
  razorpay_payout_id: string | null;
  requested_at: string;
  processed_at: string | null;
}

// ─── API response / request types ─────────────────────────────────────────────

export interface CreatorPublicProfile {
  id: string;
  name: string;
  email: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  twitter_url: string | null;
  niche: string | null;
  commission_rate: number;
  customer_discount: number;
  upi_id: string | null;
  status: string;
  created_at: string;
}

export interface StatsOverview {
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
  lifetime_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  available_balance: number;
  current_month_clicks: number;
  current_month_conversions: number;
}

export interface TimelinePoint {
  date: string;
  clicks: number;
  conversions: number;
}

// ─── JWT payload ──────────────────────────────────────────────────────────────

export interface CreatorJwtPayload {
  sub: string; // creator id
  email: string;
  iss: string;
  iat?: number;
  exp?: number;
}

// ─── Authenticated request ────────────────────────────────────────────────────

export interface AuthRequest extends Request {
  creator?: CreatorJwtPayload;
}

// ─── API response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
