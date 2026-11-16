import { NextResponse } from "next/server";

import { saveJourneysIntent } from "@/lib/server/journeysRepository";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { MONUMENTS, TIERS, VOTE_CARD, variantFrom } from "@/lib/journeys/config";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KINDS = new Set(["reserve", "notify", "vote"]);
const MONUMENT_SLUGS = new Set([...MONUMENTS.map((m) => m.slug), VOTE_CARD.slug]);

function field(value, max) {
	const s = String(value ?? "").trim();
	return s ? s.slice(0, max) : null;
}

export async function POST(request) {
	const limited = rateLimit(`journeys-intent:${clientIp(request)}`, { limit: 8, windowMs: 10 * 60 * 1000 });
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

	const kind = String(body?.kind || "");
	if (!KINDS.has(kind)) {
		return NextResponse.json({ success: false, error: "Unknown request." }, { status: 400 });
	}

	const email = String(body?.email || "").trim().toLowerCase();
	if (!EMAIL_RE.test(email) || email.length > 254) {
		return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
	}

	let monument = null;
	let tier = null;
	if (kind === "reserve") {
		monument = String(body?.monument || "");
		tier = String(body?.tier || "");
		if (!MONUMENT_SLUGS.has(monument) || monument === VOTE_CARD.slug) {
			return NextResponse.json({ success: false, error: "Please pick a monument." }, { status: 400 });
		}
		if (!TIERS[tier]) {
			return NextResponse.json({ success: false, error: "Please pick a walk." }, { status: 400 });
		}
	}

	const note = kind === "vote" ? field(body?.note, 200) : null;
	if (kind === "vote" && !note) {
		return NextResponse.json({ success: false, error: "Tell us which monument to rebuild next." }, { status: 400 });
	}

	try {
		await saveJourneysIntent({
			kind,
			email,
			monument: kind === "vote" ? VOTE_CARD.slug : monument,
			tier,
			variant: variantFrom(body?.variant),
			note,
			country: field(request.headers.get("x-vercel-ip-country"), 8),
			referrer: field(body?.referrer, 500),
			utmSource: field(body?.utm_source, 200),
			utmMedium: field(body?.utm_medium, 200),
			utmCampaign: field(body?.utm_campaign, 200),
		});
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[journeys-intent] failed to save:", err);
		return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
	}
}
