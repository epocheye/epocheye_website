import { NextResponse } from "next/server";

import { joinVirtualWaitlist } from "@/lib/server/virtualWaitlistRepository";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value, max) {
	const s = String(value ?? "").trim();
	return s ? s.slice(0, max) : null;
}

export async function POST(request) {
	const limited = rateLimit(`virtual-waitlist:${clientIp(request)}`, { limit: 5, windowMs: 10 * 60 * 1000 });
	if (!limited.ok) {
		return NextResponse.json(
			{ success: false, error: "Too many attempts. Please try again in a few minutes." },
			{ status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
		);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
	}

	// Honeypot: real visitors never see or fill this field. Answer as if it worked.
	if (String(body?.website || "").trim()) {
		return NextResponse.json({ success: true });
	}

	const email = String(body?.email || "").trim().toLowerCase();
	if (!EMAIL_RE.test(email) || email.length > 254) {
		return NextResponse.json(
			{ success: false, error: "Please enter a valid email address." },
			{ status: 400 },
		);
	}

	if (body?.consent !== true) {
		return NextResponse.json(
			{ success: false, error: "Please tick the box so we can email you when it opens." },
			{ status: 400 },
		);
	}

	const country = field(request.headers.get("x-vercel-ip-country"), 8);

	try {
		await joinVirtualWaitlist({
			email,
			country,
			utmSource: field(body?.utm_source, 200),
			utmMedium: field(body?.utm_medium, 200),
			utmCampaign: field(body?.utm_campaign, 200),
			referrer: field(body?.referrer, 500),
			consent: true,
		});
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[virtual-waitlist] failed to save signup:", err);
		return NextResponse.json(
			{ success: false, error: "Something went wrong. Please try again." },
			{ status: 500 },
		);
	}
}
