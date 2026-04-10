import { NextResponse } from "next/server";

import { creatorAuthErrorResponse, getCreatorContext } from "@/lib/server/creatorAuth";
import {
  MIN_PAYOUT_INR,
  MIN_PAYOUT_USD,
  attachRazorpayPayoutId,
  createPayoutRequest,
  getAvailableBalance,
  updatePayoutStatus,
} from "@/lib/server/creatorRepository";
import { createUpiPayout } from "@/lib/server/razorpay";

export const runtime = "nodejs";

// Convert an amount in the creator's currency to INR paise for Razorpay
function toInrPaise(amount, currency) {
  if (currency === "INR") return Math.round(amount * 100);
  // Approximate conversion for non-INR currencies
  const INR_RATES = { USD: 83, EUR: 90, GBP: 105, AUD: 54, CAD: 61, SGD: 62, AED: 23 };
  const rate = INR_RATES[currency] ?? 83;
  return Math.round(amount * rate * 100);
}

export async function POST() {
  const context = await getCreatorContext();
  if (context.error) return creatorAuthErrorResponse(context.error);

  if (!context.creator.upi_id) {
    return NextResponse.json(
      { success: false, error: "Please add your UPI ID in Settings before requesting a payout." },
      { status: 400 }
    );
  }

  const currency = context.creator.currency || "INR";
  const available = await getAvailableBalance(context.creator.id);

  // Minimum payout threshold in creator's currency
  const minPayout = currency === "INR" ? MIN_PAYOUT_INR : MIN_PAYOUT_USD;
  const currencySymbol = currency === "INR" ? "₹" : "$";

  if (available < minPayout) {
    return NextResponse.json(
      {
        success: false,
        error: `Minimum payout is ${currencySymbol}${minPayout}. Your available balance is ${currencySymbol}${available.toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  const payoutRequest = await createPayoutRequest({
    creatorId: context.creator.id,
    amount: available,
    upiId: context.creator.upi_id,
    currency,
  });

  try {
    const amountPaise = toInrPaise(available, currency);
    const razorpayPayout = await createUpiPayout({
      upiId: context.creator.upi_id,
      amountPaise,
      creatorName: context.creator.name,
      referenceId: payoutRequest.id,
      notes: {
        creator_id: context.creator.id,
        payout_request_id: payoutRequest.id,
        currency,
      },
    });

    await attachRazorpayPayoutId({
      payoutRequestId: payoutRequest.id,
      razorpayPayoutId: razorpayPayout.id,
    });

    return NextResponse.json(
      { success: true, data: { ...payoutRequest, razorpay_payout_id: razorpayPayout.id } },
      { status: 201 }
    );
  } catch (error) {
    await updatePayoutStatus({ payoutRequestId: payoutRequest.id, status: "failed" });
    return NextResponse.json(
      { success: false, error: error?.message || "Payout request failed" },
      { status: 400 }
    );
  }
}
