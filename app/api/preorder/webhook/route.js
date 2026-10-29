import { after, NextResponse } from "next/server";

import { sendPreorderPaidEmails } from "@/lib/server/preorderEmails";
import { confirmPreorderPayment, isValidWebhookSignature } from "@/lib/server/preorderPayment";
import { razorpayEnv } from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Razorpay webhook (event: order.paid). Catches payments whose browser never
// reached /api/preorder/verify, e.g. the tab closed mid-payment. Webhooks are
// account-wide, so orders from the app are acknowledged and ignored.
export async function POST(request) {
	if (!razorpayEnv("RAZORPAY_WEBHOOK_SECRET")) {
		console.error("[api/preorder/webhook] RAZORPAY_WEBHOOK_SECRET is not set");
		return NextResponse.json({ ok: false }, { status: 503 });
	}

	const raw = await request.text();
	if (!isValidWebhookSignature(raw, request.headers.get("x-razorpay-signature"))) {
		return NextResponse.json({ ok: false }, { status: 400 });
	}

	let event;
	try {
		event = JSON.parse(raw);
	} catch {
		return NextResponse.json({ ok: false }, { status: 400 });
	}

	const order = event?.payload?.order?.entity;
	const payment = event?.payload?.payment?.entity;
	if (event?.event !== "order.paid" || order?.notes?.purpose !== "preorder" || !payment?.id) {
		return NextResponse.json({ ok: true, ignored: true });
	}

	try {
		const result = await confirmPreorderPayment({ orderId: order.id, paymentId: payment.id, receipt: order.receipt ?? null });
		if (!result) console.error(`[api/preorder/webhook] no pre-order for paid order ${order.id} (receipt ${order.receipt})`);
		else if (result.newlyPaid) after(() => sendPreorderPaidEmails(result.preorder));
		return NextResponse.json({ ok: true });
	} catch (err) {
		// A 5xx makes Razorpay retry later.
		console.error("[api/preorder/webhook] failed:", err?.message ?? err);
		return NextResponse.json({ ok: false }, { status: 500 });
	}
}
