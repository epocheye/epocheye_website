import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { PREORDER_PRICE } from "@/lib/preorder/price";
import { getRazorpay, razorpayEnv } from "@/lib/server/razorpay";
import { markPreorderPaid } from "@/lib/server/preorderRepository";

// Paid pre-orders go through Razorpay Standard Checkout on the same account
// as the app: the server creates an order, the visitor pays in Razorpay's
// window, and the payment is confirmed by its signature (and again by the
// order.paid webhook, in case the tab closed before we heard back).

const RATE_TTL_MS = 60 * 60 * 1000;
const rates = new Map(); // "USD>INR" -> { rate, at }

/** Today's exchange rate: ECB reference rates (Frankfurter), then open.er-api.com. Cached an hour. */
async function exchangeRate(from, to) {
	const key = `${from}>${to}`;
	const hit = rates.get(key);
	if (hit && Date.now() - hit.at < RATE_TTL_MS) return hit.rate;
	const sources = [`https://api.frankfurter.app/latest?from=${from}&to=${to}`, `https://open.er-api.com/v6/latest/${from}`];
	for (const url of sources) {
		try {
			const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
			const rate = res.ok ? Number((await res.json())?.rates?.[to]) : NaN;
			if (rate > 0) {
				rates.set(key, { rate, at: Date.now() });
				return rate;
			}
		} catch {
			// try the next source
		}
	}
	if (hit) return hit.rate; // stale beats nothing
	throw new Error(`No ${key} exchange rate available`);
}

/** The visitor's country from Vercel's edge (ISO code), or null off Vercel. */
export function visitorCountry(request) {
	return request.headers.get("x-vercel-ip-country")?.toUpperCase() || null;
}

/**
 * What this visitor is charged. The page always shows the dollar price; in
 * India the order is in rupees at today's rate, because UPI and netbanking
 * only take INR orders. Elsewhere Razorpay Checkout offers foreign cards
 * their own currency (DCC).
 */
export async function preorderPriceFor(country) {
	const base = PREORDER_PRICE;
	if (country !== "IN") return base;
	try {
		const rate = await exchangeRate(base.currency, "INR");
		// Whole rupees, rounded up: $4.99 at 84.37 is ₹422.
		return { amount: Math.ceil((base.amount / 100) * rate) * 100, currency: "INR" };
	} catch (err) {
		console.error("[preorder] INR price unavailable, charging the base price:", err?.message ?? err);
		return base;
	}
}

/** The public half of the key pair, handed to Checkout in the browser. */
export function razorpayKeyId() {
	const keyId = razorpayEnv("RAZORPAY_KEY_ID");
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
	return hmacMatches(razorpayEnv("RAZORPAY_KEY_SECRET"), `${orderId}|${paymentId}`, signature);
}

/** Webhooks sign the raw request body with the webhook's own secret. */
export function isValidWebhookSignature(rawBody, signature) {
	return hmacMatches(razorpayEnv("RAZORPAY_WEBHOOK_SECRET"), rawBody, signature);
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
