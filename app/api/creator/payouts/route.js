import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import { getAvailableBalance, listPayoutsByCreator } from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  const [payouts, availableBalance] = await Promise.all([
    listPayoutsByCreator(context.creator.id),
    getAvailableBalance(context.creator.id),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      payouts,
      available_balance: availableBalance,
    },
  });
}
