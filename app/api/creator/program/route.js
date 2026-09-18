import { NextResponse } from "next/server";

import { getAdminSettings } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";
export const revalidate = 60;

// Public, read-only: what creators.epocheye.com shows that the admin controls.
// Reached from the creators app through its /api/creator/* rewrite.
export async function GET() {
  try {
    const settings = await getAdminSettings();
    return NextResponse.json({
      success: true,
      data: { monuments: settings.creator_monuments },
    });
  } catch {
    return NextResponse.json({ success: false, error: "unavailable" }, { status: 503 });
  }
}
