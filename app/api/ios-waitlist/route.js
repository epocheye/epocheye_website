import { NextResponse } from "next/server";

import { countRecentIosSignupsByIp, joinIosWaitlist } from "@/lib/server/iosWaitlistRepository";
import { hashPreorderIp } from "@/lib/server/preorderRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_IP_PER_HOUR = 10;

const fail = (status, error) => NextResponse.json({ success: false, error }, { status });

// Public: an iPhone visitor asks to hear when Epocheye is on the App Store.
export async function POST(request) {
	let body;
	try {
		body = await request.json();
	} catch {
		return fail(400, "Invalid request.");
	}

	// Honeypot: real visitors never see this field. Answer as if it worked.
	if (typeof body?.website === "string" && body.website.trim()) return NextResponse.json({ success: true });

	const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
	if (!EMAIL_RE.test(email)) return fail(400, "Please enter a valid email address.");

	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
	const ipHash = hashPreorderIp(ip);

	try {
		if ((await countRecentIosSignupsByIp(ipHash)) >= MAX_PER_IP_PER_HOUR) {
			return fail(429, "Too many sign-ups from this connection. Please try again in an hour.");
		}
		await joinIosWaitlist({ email, source: "preorder", ipHash });
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[api/ios-waitlist] failed:", err?.message ?? err);
		return fail(500, "We couldn't add you just now. Please try again in a moment.");
	}
}
