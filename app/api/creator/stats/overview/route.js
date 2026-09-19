import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { fetchCreatorCodeEntries } from "@/lib/server/backendSync";
import { getStatsOverview } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const overview = await getStatsOverview(context.creator.id);

  // Clicks = scans of the creator's QR (epocheye.com/r/CODE, counted by the
  // website). Code entries = people typing the code in the app, counted by the
  // backend. Sales are counted only when someone pays with the code.
  overview.code_entries =
    context.creator.status === "active" ? (await fetchCreatorCodeEntries(context.creator)) ?? 0 : 0;
  return NextResponse.json(
    { success: true, data: overview },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=30",
      },
    },
  );
}
