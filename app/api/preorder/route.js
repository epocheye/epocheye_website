import { after, NextResponse } from "next/server";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { ADMIN_NOTIFY_EMAIL, sendEmail } from "@/lib/server/email";
import { countRecentPreordersByIp, hashPreorderIp, upsertPreorder } from "@/lib/server/preorderRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONUMENT_BY_SLUG = new Map(LIVE_MONUMENTS.map((m) => [m.slug, m]));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_PER_IP_PER_HOUR = 8;

const fail = (status, error) => NextResponse.json({ success: false, error }, { status });

function clean(value, max) {
	return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

// Public: the reserve form on /preorder. Nothing is charged; the row only
// holds the visitor's place and lets us email them.
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
	const phoneRaw = clean(body?.phone, 24);
	const phoneDigits = phoneRaw.replace(/[^\d+]/g, "");
	const monument = MONUMENT_BY_SLUG.get(clean(body?.monument, 80));
	const visitMonth = clean(body?.visitMonth, 7) || null;
	const marketingOk = body?.marketingOk === true;

	if (name.length < 2) return fail(400, "Please enter your name.");
	if (!EMAIL_RE.test(email)) return fail(400, "Please enter a valid email address.");
	if (phoneRaw && !/^\+?\d{10,15}$/.test(phoneDigits)) return fail(400, "Please enter a valid phone number, or leave it blank.");
	if (!monument) return fail(400, "Please choose a monument.");
	if (visitMonth && !MONTH_RE.test(visitMonth)) return fail(400, "Please choose a valid visit month.");

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
			phone: phoneRaw ? phoneDigits : null,
			monumentSlug: monument.slug,
			visitMonth,
			marketingOk,
			ipHash,
			userAgent: clean(request.headers.get("user-agent"), 300) || null,
		});

		if (created) {
			const place = `${monument.name}, ${monument.city}`;
			after(() =>
				Promise.all([
					sendEmail({
						to: email,
						subject: `Your Epocheye pre-order: ${monument.name}`,
						text: [
							`Hi ${name},`,
							"",
							`Your pre-order for ${place} is in. Your reference is ${reference}.`,
							"",
							"Nothing has been charged. We will email you about your pre-order before your visit.",
							"",
							"Epocheye",
							"support@epocheye.app",
						].join("\n"),
						replyTo: ADMIN_NOTIFY_EMAIL,
					}),
					sendEmail({
						to: ADMIN_NOTIFY_EMAIL,
						subject: `New pre-order ${reference}: ${monument.name}`,
						text: [
							`Reference: ${reference}`,
							`Name: ${name}`,
							`Email: ${email}`,
							`Phone: ${phoneRaw ? phoneDigits : "-"}`,
							`Monument: ${place}`,
							`Visit month: ${visitMonth ?? "-"}`,
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
