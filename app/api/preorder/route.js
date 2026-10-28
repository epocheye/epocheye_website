import { after, NextResponse } from "next/server";

import { OTHER_SITE, PREORDER_SITES, SITE_BY_SLUG } from "@/lib/preorder/sites";
import { ADMIN_NOTIFY_EMAIL, sendEmail } from "@/lib/server/email";
import {
	countPreordersBySlug,
	countRecentPreordersByIp,
	hashPreorderIp,
	upsertPreorder,
} from "@/lib/server/preorderRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_IP_PER_HOUR = 8;
const SLUGS = PREORDER_SITES.map((s) => s.slug);

const fail = (status, error) => NextResponse.json({ success: false, error }, { status });

function clean(value, max) {
	return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

// Public: the leaderboard on /preorder. Counts for the listed sites only;
// "other" suggestions are never shown.
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

// Public: the pre-order form on /preorder. Nothing is charged; the row counts
// toward the site's place on the leaderboard and lets us email the visitor.
export async function POST(request) {
	let body;
	try {
		body = await request.json();
	} catch {
		return fail(400, "Invalid request.");
	}

	// Honeypot: real visitors never see this field. Answer as if it worked.
	if (clean(body?.website, 200)) {
		return NextResponse.json({ success: true, data: { reference: "EE-RECEIVED", created: true } });
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

	const siteLabel = site ? `${site.name}, ${site.place}` : suggestion;
	const ip =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
	const ipHash = hashPreorderIp(ip);

	try {
		if ((await countRecentPreordersByIp(ipHash)) >= MAX_PER_IP_PER_HOUR) {
			return fail(429, "Too many pre-orders from this connection. Please try again in an hour.");
		}

		const { reference, created } = await upsertPreorder({
			name,
			email,
			siteSlug,
			suggestion: suggestion || null,
			marketingOk,
			ipHash,
			userAgent: clean(request.headers.get("user-agent"), 300) || null,
		});

		if (created) {
			after(() =>
				Promise.all([
					sendEmail({
						to: email,
						subject: `Your Epocheye pre-order: ${site ? site.name : suggestion}`,
						text: [
							`Hi ${name},`,
							"",
							`Your pre-order for ${siteLabel} is in. Your reference is ${reference}.`,
							"",
							"Nothing has been charged. The sites with the most pre-orders are built first,",
							"and when yours is ready we will email you so you can see it first.",
							"",
							"Epocheye",
							"support@epocheye.app",
						].join("\n"),
						replyTo: ADMIN_NOTIFY_EMAIL,
					}),
					sendEmail({
						to: ADMIN_NOTIFY_EMAIL,
						subject: `New pre-order ${reference}: ${site ? site.name : `Suggestion: ${suggestion}`}`,
						text: [
							`Reference: ${reference}`,
							`Name: ${name}`,
							`Email: ${email}`,
							`Site: ${siteLabel}${site ? "" : " (suggested)"}`,
							`Marketing email OK: ${marketingOk ? "yes" : "no"}`,
						].join("\n"),
					}),
				])
			);
		}

		return NextResponse.json({ success: true, data: { reference, created } });
	} catch (err) {
		console.error("[api/preorder] failed:", err?.message ?? err);
		return fail(500, "We couldn't save your pre-order. Please try again in a moment.");
	}
}
