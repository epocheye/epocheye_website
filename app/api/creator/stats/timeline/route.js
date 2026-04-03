import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { getStatsTimeline } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET(request) {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const { searchParams } = new URL(request.url);
  const parsedDays = Number.parseInt(searchParams.get("days") || "30", 10);
  const days = Math.min(90, Math.max(7, Number.isFinite(parsedDays) ? parsedDays : 30));

  const timeline = await getStatsTimeline(context.creator.id, days);
  return NextResponse.json({ success: true, data: timeline });
}
