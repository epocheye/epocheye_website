import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import {
  MIN_PAYOUT_USD,
  USD_TO_INR,
  attachRazorpayPayoutId,
  createPayoutRequest,
  getAvailableBalance,
  updatePayoutStatus,
} from "@/lib/server/creatorRepository";
import { createUpiPayout } from "@/lib/server/razorpay";

export const runtime = "nodejs";

export async function POST() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  if (!context.creator.upi_id) {
    return NextResponse.json(
      {
        success: false,
        error: "Please add your UPI ID in Settings before requesting a payout.",
      },
      { status: 400 }
    );
  }

  const available = await getAvailableBalance(context.creator.id);
  if (available < MIN_PAYOUT_USD) {
    return NextResponse.json(
      {
        success: false,
        error: `Minimum payout is $${MIN_PAYOUT_USD}. Your available balance is $${available.toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  const payoutRequest = await createPayoutRequest({
    creatorId: context.creator.id,
    amount: available,
    upiId: context.creator.upi_id,
  });

  try {
    const amountPaise = Math.round(available * USD_TO_INR * 100);
    const razorpayPayout = await createUpiPayout({
      upiId: context.creator.upi_id,
      amountPaise,
      creatorName: context.creator.name,
      referenceId: payoutRequest.id,
      notes: {
        creator_id: context.creator.id,
        payout_request_id: payoutRequest.id,
      },
    });

    await attachRazorpayPayoutId({
      payoutRequestId: payoutRequest.id,
      razorpayPayoutId: razorpayPayout.id,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...payoutRequest,
          razorpay_payout_id: razorpayPayout.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await updatePayoutStatus({ payoutRequestId: payoutRequest.id, status: "failed" });
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Payout request failed",
      },
      { status: 400 }
    );
  }
}
