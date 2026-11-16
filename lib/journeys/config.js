// /journeys: pre-orders for virtual walks through reconstructed Indian monuments.
//
// This is the ONLY file on the site that may carry a /journeys price, and only
// app/journeys/** and components/journeys/** may import it. Copy rules: no em or en
// dashes, no invented numbers, no quotes, no countdowns, never "available now".
// Anything unknown is a `[SAMBIT: ...]` placeholder. Facts in copy are limited to the
// list in JOURNEYS.md.

// Checkout stays off until Dodo Payments is connected (lib/journeys/checkout.js).
// Set NEXT_PUBLIC_JOURNEYS_CHECKOUT=true to switch it on.
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_JOURNEYS_CHECKOUT === "true";

// Bump when any file under public/journeys/ is replaced: those files are served with a one-year
// immutable cache, so a new query string is what makes browsers fetch the new version.
export const ASSET_VERSION = "4";
export const assetUrl = (path) => `${path}?v=${ASSET_VERSION}`;

export const VARIANTS = ["default", "family", "history"];

export function variantFrom(value) {
	return VARIANTS.includes(value) ? value : "default";
}

// Teaser objects live in public/journeys/{models,posters,loops}/<slug>.*
// See JOURNEYS.md "Add a monument card".
export const MONUMENTS = [
	{
		slug: "tipu-summer-palace",
		name: "Tipu Sultan's Summer Palace",
		city: "Bengaluru",
		era: "Completed around 1791",
		opens: "[SAMBIT: date]",
		object: "palace-pillar",
		alt: "A carved teak pillar from Tipu Sultan's Summer Palace carrying a cusped arch and a painted floral panel.",
	},
	{
		slug: "bangalore-fort",
		name: "Bangalore Fort",
		city: "Bengaluru",
		era: "[SAMBIT: era]",
		opens: "[SAMBIT: date]",
		object: "fort-gateway",
		alt: "The stone gateway arch of Bangalore Fort.",
	},
	{
		slug: "victoria-memorial",
		name: "Victoria Memorial",
		city: "Kolkata",
		era: "[SAMBIT: era]",
		opens: "[SAMBIT: date]",
		object: "victoria-dome",
		alt: "The central dome of the Victoria Memorial with the winged figure on top.",
	},
	{
		slug: "indian-museum",
		name: "Indian Museum",
		city: "Kolkata",
		era: "[SAMBIT: era]",
		opens: "[SAMBIT: date]",
		object: "museum-colonnade",
		alt: "One bay of the colonnade of the Indian Museum.",
	},
];

export const VOTE_CARD = {
	slug: "vote",
	name: "Vote for the next monument",
	line: "Founding members' votes are binding.",
};

export const TIERS = {
	solo: {
		id: "solo",
		name: "Solo walk",
		price: "$12",
		founding: "$9",
		includes: ["One guided walk, eight stops", "Narrated stop by stop", "Any browser, no app"],
	},
	family: {
		id: "family",
		name: "Family pass",
		price: "$24",
		founding: "$18",
		includes: [
			"One walk, shared with your household",
			"Narrated stop by stop",
			"Credit toward the on-site Epocheye app on a future India trip",
		],
	},
};

export const PRICING_NOTE = "Founding prices end 72 hours after opening.";

export function tierOrder(variant) {
	return variant === "family" ? ["family", "solo"] : ["solo", "family"];
}

export const HERO = {
	eyebrow: "Tipu Sultan's Summer Palace · Bengaluru",
	title: "WALK INTO 1791",
	line: {
		default: "Rebuilt from 1790s drawings and records. Narrated stop by stop. No flight required.",
		history: "Rebuilt from 1790s drawings and records. Narrated stop by stop. No flight required.",
		family: "Show your kids Bangalore as it stood in the 1790s, before your next trip home.",
	},
	button: "Reserve your walk",
};

export const FRAMES = {
	gone: {
		eyebrow: "What's gone",
		title: "The painted walls that made this palace famous have almost all faded away.",
	},
	rebuilt: {
		eyebrow: "What we did",
		title: "We rebuilt them. Room by room, from the records the British left behind.",
	},
	steps: {
		small: "Your walk in",
		title: "Two steps",
		items: [
			{ n: "01", a: "Reserve", b: "your founding spot" },
			{ n: "02", a: "Walk in", b: "on opening day" },
		],
	},
	reserve: {
		eyebrow: "Step one · Reserve",
		title: "Pick a monument. Pay once. Full refund any time before it opens.",
	},
	stops: {
		eyebrow: "Eight stops",
		title: "A guided walk through eight stops inside the palace.",
	},
	narration: {
		eyebrow: "Narration",
		title: "What stood here, and what happened in it, told stop by stop.",
	},
	rockets: {
		eyebrow: "The rockets",
		title:
			"Mysore's iron rockets under Hyder Ali and Tipu Sultan became Britain's Congreve rockets. The same ones in “the rockets' red glare.”",
	},
	walkin: {
		eyebrow: "Step two · Walk in",
		title: "Your private link arrives by email on opening day. Any browser. No app.",
	},
	facts: [
		{ title: "Almost entirely", sub: "teak" },
		{ title: "Completed", sub: "around 1791" },
		{ title: "Used as British offices", sub: "after 1799" },
	],
	collection: { eyebrow: "The collection", title: "Choose your walk." },
	pricing: { eyebrow: "Pricing", title: "One payment. Yours to keep." },
	refund: {
		lines: [
			"Miss the date, and we refund you automatically.",
			"Change your mind before it opens. Full refund, one click.",
			"Walked it and didn't love it. Full refund within 7 days.",
		],
	},
	founder: {
		eyebrow: "A note from the founder",
		text: "[SAMBIT: 3 lines]",
		signature: "Sambit, Epocheye, Bengaluru",
	},
	final: {
		title: "Step into 1791",
		button: "Reserve your walk",
		notify: "Just notify me",
		notifyPlaceholder: "you@example.com",
		notifyButton: "Notify me",
		notifyDone: "Thanks. We'll email you before it opens.",
	},
};

// The order of the full-screen frames. `history` moves the rockets up to frame 2.
export function frameOrder(variant) {
	const base = ["hero", "gone", "rebuilt", "steps", "reserve", "stops", "narration", "rockets", "walkin"];
	if (variant === "history") {
		return ["hero", "rockets", "gone", "rebuilt", "steps", "reserve", "stops", "narration", "walkin"];
	}
	return base;
}

// Photographs the teaser objects were modelled from (Wikimedia Commons). Logged in CREDITS.md
// and shown in the footer, as the licences require.
export const PHOTO_CREDITS = [
	{ what: "Summer Palace pillar", title: "Wooden arches", author: "Shrav 2104", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Wooden_arches.jpg" },
	{ what: "Bangalore Fort gateway", title: "Bangalore Fort 3", author: "Indrajit Roy", licence: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Bangalore_Fort_3.jpg" },
	{ what: "Victoria Memorial dome", title: "Victoria Memorial Kolkata Dome", author: "Amit Sen", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Victoria_Memorial_Kolkata_Dome.jpg" },
	{ what: "Indian Museum colonnade", title: "Building of Calcutta Museum 05", author: "Pinakpani", licence: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Building_of_Calcutta_Museum_05.jpg" },
];

export const FOOTER = {
	company: "Epocheye Private Limited, India.",
	creditsLead: "3D teasers modelled from photographs on Wikimedia Commons:",
	links: [
		{ label: "Terms", href: "/journeys/terms" },
		{ label: "Privacy", href: "/journeys/privacy" },
		{ label: "Refunds", href: "/journeys/refunds" },
		{ label: "Contact", href: "mailto:support@epocheye.app" },
	],
};

export const MODAL = {
	title: "Reserve your founding spot",
	monument: "Monument",
	tier: "Walk",
	email: "Email",
	submit: "Reserve",
	submitting: "Saving",
	voteTitle: "Vote for the next monument",
	voteField: "Which monument should we rebuild next?",
	voteSubmit: "Cast my vote",
	success: (monument) => `You're on the founding list for ${monument}. We'll email you before it opens.`,
	voteSuccess: "Your vote is in. Founding members' votes are binding.",
	consent: "No payment today. We'll email you once before it opens, and you can unsubscribe anytime.",
};
