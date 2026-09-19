import { NextResponse } from "next/server";

import { getAdminSettings } from "@/lib/server/creatorRepository";
import { getInrPerUsd } from "@/lib/server/fx";

export const runtime = "nodejs";
export const revalidate = 60;

// Public, read-only: what creators.epocheye.com shows that the admin controls,
// plus the daily INR-per-USD rate used to show creator amounts in dollars.
// Reached from the creators app through its /api/creator/* rewrite.
export async function GET() {
  try {
    const [settings, fx] = await Promise.all([getAdminSettings(), getInrPerUsd()]);
    return NextResponse.json({
      success: true,
      data: {
        monuments: settings.creator_monuments,
        inr_per_usd: fx.rate,
        fx_date: fx.date,
        min_payout_inr: settings.min_payout_inr,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "unavailable" }, { status: 503 });
  }
}
