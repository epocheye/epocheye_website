import "server-only";

import Razorpay from "razorpay";

let razorpayClient = null;

function getRazorpay() {
  if (razorpayClient) return razorpayClient;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars");
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

export async function createUpiPayout({
  upiId,
  amountPaise,
  creatorName,
  referenceId,
  notes,
}) {
  const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER;
  if (!accountNumber) {
    throw new Error("Missing RAZORPAY_ACCOUNT_NUMBER env var");
  }

  const client = getRazorpay();
  const payout = await client.payouts.create({
    account_number: accountNumber,
    fund_account: {
      account_type: "vpa",
      vpa: { address: upiId },
      contact: {
        name: creatorName,
        type: "customer",
        reference_id: referenceId,
      },
    },
    amount: amountPaise,
    currency: "INR",
    mode: "UPI",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: referenceId,
    narration: "Epocheye Creator Commission",
    notes: notes ?? {},
  });

  return {
    id: payout.id,
    status: payout.status,
  };
}
