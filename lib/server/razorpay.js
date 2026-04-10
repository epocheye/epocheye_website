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

  razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayClient;
}

/**
 * Payouts are manual — admin transfers money directly via UPI to the creator's
 * UPI ID, then marks the payout as completed in the admin dashboard.
 *
 * This function validates the payout details and returns a structured record
 * that the admin UI displays (UPI ID, amount, creator name) for manual transfer.
 */
export function prepareManualPayout({ upiId, amountPaise, creatorName, referenceId }) {
  if (!upiId) throw new Error("Creator has no UPI ID set");
  if (!amountPaise || amountPaise <= 0) throw new Error("Invalid payout amount");

  return {
    upiId,
    amountInr: (amountPaise / 100).toFixed(2),
    amountPaise,
    creatorName,
    referenceId,
    instructions: `Send ₹${(amountPaise / 100).toFixed(2)} to UPI ID: ${upiId} (${creatorName})`,
  };
}

// Kept for potential future use with RazorpayX (business banking product).
// Currently unused — payouts are handled manually.
export { getRazorpay };
