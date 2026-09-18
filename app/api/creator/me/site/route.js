import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { getCreatorSiteStatus } from "@/lib/server/creatorSites";

export const runtime = "nodejs";

// The creator's current monument, window, and sales vs target, or their place
// in line.
export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);
  if (context.creator.status !== "active") {
    return NextResponse.json({ success: true, data: { state: "not_approved" } });
  }
  const status = await getCreatorSiteStatus(context.creator.id);
  return NextResponse.json({ success: true, data: status });
}
