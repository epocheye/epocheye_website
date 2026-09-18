import { NextResponse } from "next/server";

import { rotateSites } from "@/lib/server/creatorSites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily creator-site rotation (Vercel Cron, see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set on the project.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const log = await rotateSites();
  return NextResponse.json({ success: true, data: { log } });
}
