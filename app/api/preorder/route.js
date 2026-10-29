import { NextResponse } from "next/server";

import { OTHER_SITE, PREORDER_SITES, SITE_BY_SLUG } from "@/lib/preorder/sites";
import {
	attachPreorderOrder,
	countPreordersBySlug,
	countRecentPreordersByIp,
	hashPreorderIp,
	reservePreorder,
} from "@/lib/server/preorderRepository";
import { createPreorderOrder, preorderPriceFor, razorpayKeyId, visitorCountry } from "@/lib/server/preorderPayment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_IP_PER_HOUR = 8;
const SLUGS = PREORDER_SITES.map((s) => s.slug);

const fail = (status, error) => NextResponse.json({ success: false, error }, { status });

function clean(value, max) {
	return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

// Public: the leaderboard on /preorder. Paid pre-orders for the listed sites
// only; "other" suggestions are never shown. The price is /api/preorder/price.
export async function GET() {
	try {
		const counts = await countPreordersBySlug(SLUGS);
		return NextResponse.json(
			{ success: true, data: { counts } },
			{ headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
		);
	} catch (err) {
		console.error("[api/preorder] leaderboard failed:", err?.message ?? err);
		return fail(500, "Leaderboard unavailable.");
	}
}

// Public: starts a paid pre-order. Holds the visitor's place and opens a
// Razorpay order for it; the browser then pays in Razorpay Checkout and
// confirms through /api/preorder/verify.
export async function POST(request) {
	let body;
	try {
		body = await request.json();
	} catch {
		return fail(400, "Invalid request.");
	}

	// Honeypot: real visitors never see this field. Answer as if it worked.
	if (clean(body?.website, 200)) {
		return NextResponse.json({ success: true, data: { reference: "EE-RECEIVED", alreadyPaid: true } });
	}

	const name = clean(body?.name, 80);
	const email = clean(body?.email, 254).toLowerCase();
	const siteSlug = clean(body?.site, 80);
	const site = SITE_BY_SLUG.get(siteSlug);
	const suggestion = siteSlug === OTHER_SITE ? clean(body?.suggestion, 100) : "";
	const marketingOk = body?.marketingOk === true;

	if (name.length < 2) return fail(400, "Please enter your name.");
	if (!EMAIL_RE.test(email)) return fail(400, "Please enter a valid email address.");
	if (!site && siteSlug !== OTHER_SITE) return fail(400, "Please choose a site.");
	if (siteSlug === OTHER_SITE && suggestion.length < 3) return fail(400, "Please tell us which site you want.");

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
	const ipHash = hashPreorderIp(ip);

	try {
		if ((await countRecentPreordersByIp(ipHash)) >= MAX_PER_IP_PER_HOUR) {
			return fail(429, "Too many pre-orders from this connection. Please try again in an hour.");
		}

		const { reference, paid } = await reservePreorder({
			name,
			email,
			siteSlug,
			suggestion: suggestion || null,
			marketingOk,
			ipHash,
			userAgent: clean(request.headers.get("user-agent"), 300) || null,
		});
		// Already paid for this site with this email: never charge twice.
		if (paid) return NextResponse.json({ success: true, data: { reference, alreadyPaid: true } });

		const price = await preorderPriceFor(visitorCountry(request));
		const order = await createPreorderOrder({ reference, price, siteSlug, email });
		await attachPreorderOrder({ reference, orderId: order.id, amount: order.amount, currency: order.currency });

		return NextResponse.json({
			success: true,
			data: {
				reference,
				alreadyPaid: false,
				keyId: razorpayKeyId(),
				order: { id: order.id, amount: order.amount, currency: order.currency },
			},
		});
	} catch (err) {
		console.error("[api/preorder] failed:", err?.error?.description ?? err?.message ?? err);
		return fail(500, "We couldn't start your pre-order. Please try again in a moment.");
	}
}
