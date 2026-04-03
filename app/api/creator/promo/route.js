import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  if (!context.promo) {
    return NextResponse.json({ success: false, error: "No promo code found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: context.promo });
}
