"use client";

import { track } from "@vercel/analytics";

// Cookieless Vercel Analytics custom events for /virtual, each tagged with utm_source.
export function utmParams() {
	if (typeof window === "undefined") return {};
	const p = new URLSearchParams(window.location.search);
	return {
		utm_source: p.get("utm_source") || "",
		utm_medium: p.get("utm_medium") || "",
		utm_campaign: p.get("utm_campaign") || "",
	};
}

export function trackVirtual(event) {
	try {
		// The page-view event fires from an effect that can run before <Analytics/> has set up
		// window.va. Create the same queue it would, so the event waits instead of being dropped.
		if (!window.va) {
			window.va = function va(...params) {
				(window.vaq = window.vaq || []).push(params);
			};
		}
		track(event, { utm_source: utmParams().utm_source || "(none)" });
	} catch {
		// Analytics must never break the page.
	}
}
