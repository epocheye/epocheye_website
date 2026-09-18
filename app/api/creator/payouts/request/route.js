import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import {
  createPayoutRequest,
  getAdminSettings,
  getAvailableBalance,
} from "@/lib/server/creatorRepository";

export const runtime = "nodejs";

export async function POST() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  if (!context.creator.upi_id) {
    return NextResponse.json(
      { success: false, error: "Please add your UPI ID in Settings before requesting a payout." },
      { status: 400 }
    );
  }

  // Program is India-only: every balance and payout is in rupees.
  const currency = "INR";
  const [available, settings] = await Promise.all([
    getAvailableBalance(context.creator.id),
    getAdminSettings(),
  ]);
  const minPayout = settings.min_payout_inr;

  if (available < minPayout) {
    return NextResponse.json(
      {
        success: false,
        error: `Minimum payout is ₹${minPayout}. Your available balance is ₹${available.toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  // Create the payout request — admin will process the actual UPI transfer manually
  // and mark it as completed in the admin dashboard.
  const payoutRequest = await createPayoutRequest({
    creatorId: context.creator.id,
    amount: available,
    upiId: context.creator.upi_id,
    currency,
  });

  return NextResponse.json({ success: true, data: payoutRequest }, { status: 201 });
}
