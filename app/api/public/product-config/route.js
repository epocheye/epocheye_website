import { NextResponse } from "next/server";

import { getAdminSettings } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getAdminSettings();
  return NextResponse.json({
    success: true,
    data: {
      name: settings.product_name,
      description: settings.product_description,
      price_inr: settings.product_price_inr,
      validity_days: settings.product_validity_days,
      enabled: settings.product_enabled,
    },
  });
}
