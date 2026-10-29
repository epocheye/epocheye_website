import { after, NextResponse } from "next/server";

import { sendPreorderPaidEmails } from "@/lib/server/preorderEmails";
import { confirmPreorderPayment, isValidPaymentSignature } from "@/lib/server/preorderPayment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status, error) => NextResponse.json({ success: false, error }, { status });
const ID_RE = /^[A-Za-z0-9_]{6,64}$/;

// Public: Razorpay Checkout's success handler posts the payment here. The
// signature proves the payment belongs to our order; only then is it paid.
export async function POST(request) {
	let body;
	try {
		body = await request.json();
	} catch {
		return fail(400, "Invalid request.");
	}

	const orderId = body?.razorpay_order_id;
	const paymentId = body?.razorpay_payment_id;
	const signature = body?.razorpay_signature;
	if (!ID_RE.test(orderId ?? "") || !ID_RE.test(paymentId ?? "")) return fail(400, "Invalid payment details.");
	if (!isValidPaymentSignature({ orderId, paymentId, signature })) {
		return fail(400, "We couldn't verify this payment. If you were charged, email support@epocheye.app.");
	}

	try {
		const result = await confirmPreorderPayment({ orderId, paymentId });
		if (!result) {
			console.error(`[api/preorder/verify] no pre-order for paid order ${orderId} (payment ${paymentId})`);
			return fail(404, "Payment received, but we couldn't find your pre-order. Email support@epocheye.app and we'll sort it out.");
		}
		if (result.newlyPaid) after(() => sendPreorderPaidEmails(result.preorder));
		return NextResponse.json({ success: true, data: { reference: result.preorder.reference } });
	} catch (err) {
		console.error("[api/preorder/verify] failed:", err?.error?.description ?? err?.message ?? err);
		return fail(500, "Payment received. We couldn't confirm it just now; you'll get an email once it's confirmed.");
	}
}
