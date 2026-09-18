import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { fetchCreatorCodeEntries } from "@/lib/server/backendSync";
import { getStatsOverview } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const overview = await getStatsOverview(context.creator.id);

  // There are no share links: a creator's "clicks" are people entering their
  // code in the app, counted by the backend (one per person per day).
  const entries =
    context.creator.status === "active" ? await fetchCreatorCodeEntries(context.creator) : 0;
  overview.total_clicks = entries ?? 0;
  overview.current_month_clicks = null;
  overview.conversion_rate =
    overview.total_clicks > 0
      ? Number(((overview.total_conversions / overview.total_clicks) * 100).toFixed(1))
      : 0;
  return NextResponse.json(
    { success: true, data: overview },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=30",
      },
    },
  );
}
