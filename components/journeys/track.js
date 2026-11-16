"use client";

import { track } from "@vercel/analytics";

// Cookieless Vercel Analytics events for /journeys. Every event carries the audience variant
// (?for=family | ?for=history | default) so reserve clicks can be read per variant.
export function trackJourneys(event, props = {}) {
	try {
		if (!window.va) {
			window.va = function va(...params) {
				(window.vaq = window.vaq || []).push(params);
			};
		}
		track(event, props);
	} catch {
		// Analytics must never break the page.
	}
}

export function landingParams() {
	if (typeof window === "undefined") return {};
	const p = new URLSearchParams(window.location.search);
	return {
		utm_source: p.get("utm_source") || "",
		utm_medium: p.get("utm_medium") || "",
		utm_campaign: p.get("utm_campaign") || "",
		referrer: document.referrer || "",
	};
}
