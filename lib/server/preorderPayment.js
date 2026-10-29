import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getRazorpay } from "@/lib/server/razorpay";
import { markPreorderPaid } from "@/lib/server/preorderRepository";

// Paid pre-orders go through Razorpay Standard Checkout on the same account
// as the app: the server creates an order, the visitor pays in Razorpay's
// window, and the payment is confirmed by its signature (and again by the
// order.paid webhook, in case the tab closed before we heard back).

/** The pre-order price, from env: PREORDER_CURRENCY (default USD) and PREORDER_AMOUNT in minor units (default 500 = $5). */
export function preorderPrice() {
	const currency = (process.env.PREORDER_CURRENCY || "USD").trim().toUpperCase();
	const amount = Number(process.env.PREORDER_AMOUNT || 500);
	if (!/^[A-Z]{3}$/.test(currency)) throw new Error("PREORDER_CURRENCY must be a 3-letter currency code");
	if (!Number.isInteger(amount) || amount < 100) throw new Error("PREORDER_AMOUNT must be a whole number of minor units, at least 100");
	return { amount, currency };
}

/** The public half of the key pair, handed to Checkout in the browser. */
export function razorpayKeyId() {
	const keyId = process.env.RAZORPAY_KEY_ID;
	if (!keyId) throw new Error("Missing RAZORPAY_KEY_ID env var");
	return keyId;
}

export function createPreorderOrder({ reference, price, siteSlug, email }) {
	return getRazorpay().orders.create({
		amount: price.amount,
		currency: price.currency,
		receipt: reference,
		notes: { purpose: "preorder", reference, site: siteSlug, email },
	});
}

export function fetchRazorpayOrder(orderId) {
	return getRazorpay().orders.fetch(orderId);
}

function hmacMatches(secret, payload, signature) {
	if (!secret || typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) return false;
	const expected = createHmac("sha256", secret).update(payload).digest();
	return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

/** Checkout's success handler signs "order_id|payment_id" with the key secret. */
export function isValidPaymentSignature({ orderId, paymentId, signature }) {
	return hmacMatches(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`, signature);
}

/** Webhooks sign the raw request body with the webhook's own secret. */
export function isValidWebhookSignature(rawBody, signature) {
	return hmacMatches(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody, signature);
}

/**
 * Marks a signed or webhooked payment paid. `receipt` is the order's receipt
 * (our reference) when the caller has it; otherwise it is fetched from
 * Razorpay if the order id alone finds no pre-order.
 */
export async function confirmPreorderPayment({ orderId, paymentId, receipt = null }) {
	const result = await markPreorderPaid({ orderId, paymentId, reference: receipt });
	if (result || receipt) return result;
	const order = await fetchRazorpayOrder(orderId);
	return order?.receipt ? markPreorderPaid({ orderId, paymentId, reference: order.receipt }) : null;
}
