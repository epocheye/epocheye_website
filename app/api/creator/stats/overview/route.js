import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { getStatsOverview } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const overview = await getStatsOverview(context.creator.id);
  return NextResponse.json(
    { success: true, data: overview },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=30",
      },
    },
  );
}
