import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { getAvailableBalance } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const availableBalance = await getAvailableBalance(context.creator.id);
  return NextResponse.json({ success: true, data: { available_balance: availableBalance } });
}
