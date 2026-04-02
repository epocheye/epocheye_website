import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars");
    }

    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

/**
 * Initiate a UPI payout via Razorpay Payouts API.
 * amount is in USD cents (Razorpay expects paise for INR, but we store USD).
 * For now we pass through the amount as-is; convert currency before calling.
 */
export async function createUpiPayout(params: {
  upiId: string;
  amountPaise: number; // amount in paise (INR smallest unit)
  creatorName: string;
  referenceId: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; status: string }> {
  const rzp = getRazorpay();

  // Razorpay Payouts API uses their Payouts endpoint
  // https://razorpay.com/docs/api/payouts/
  const payout = await (rzp as any).payouts.create({
    account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
    fund_account: {
      account_type: "vpa",
      vpa: { address: params.upiId },
      contact: {
        name: params.creatorName,
        type: "customer",
        reference_id: params.referenceId,
      },
    },
    amount: params.amountPaise,
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: params.referenceId,
    narration: "Epocheye Creator Commission",
    notes: params.notes ?? {},
  });

  return { id: payout.id, status: payout.status };
}
