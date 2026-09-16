import { NextResponse } from "next/server";

import { getAdminSettings } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";
export const revalidate = 60;

// Public: powers the "first 500 free in Bangalore" section on the landing page.
// Only exposes the offer fields, never the rest of admin_settings.
export async function GET() {
  try {
    const s = await getAdminSettings();
    const total = Math.max(1, s.offer_total);
    const claimed = Math.min(Math.max(0, s.offer_claimed), total);
    return NextResponse.json({
      success: true,
      data: {
        enabled: s.offer_enabled,
        claimed,
        total,
        promoCode: s.offer_promo_code,
        soldOut: claimed >= total,
      },
    });
  } catch (err) {
    console.error("[api/offer] failed to load offer settings:", err?.message);
    return NextResponse.json({ success: false, error: "Offer unavailable" }, { status: 503 });
  }
}
