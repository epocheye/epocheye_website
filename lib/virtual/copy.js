// Copy for /virtual (Tipu Sultan's Summer Palace, virtual walk). Verbatim from the brief.
// Rules: no em or en dashes, no numbers or traction claims, never say AR or app,
// no figures or characters, building and history only.
// This is the ONLY place the price may appear on the site, and only server code
// imports it, so the price reaches the browser only when SALES_OPEN is true.
// scripts/check-virtual-copy.mjs enforces this.

export const TITLE = "Tipu Sultan's Summer Palace, as it stood in the 1790s | Epocheye";

export const HEADLINE_LEAD = "Tipu Sultan's Summer Palace still stands.";
export const HEADLINE_TURN = "Most of what made it extraordinary does not.";
export const HEADLINE = `${HEADLINE_LEAD} ${HEADLINE_TURN}`;

export const SUBLINE =
	"Walk through it as it stood in the 1790s. Rebuilt from period drawings and records, narrated room by room. No flight required.";

export const WAITLIST_BUTTON = "Get early access";
export const WAITLIST_NOTE = "We're opening it to a small group first.";
export const CONSENT_LABEL = "Email me when it opens. I can unsubscribe anytime.";
export const SUCCESS = "You're on the list.";

export const CHECKOUT_BUTTON = "Get access, $25";
export const CHECKOUT_NOTE =
	"One payment. Yours to keep. Full refund within 14 days if it is not for you.";

export const WHAT_YOU_GET_TITLE = "What you get";
export const WHAT_YOU_GET = [
	"Eight stops inside the palace, as it stood in the 1790s",
	"Narrated, room by room",
	"Watch it on your phone or laptop, from home",
	"Opening to early access first",
];

export const FAQ = [
	{ q: "Do I need to travel to India?", a: "No. You watch it from home." },
	{
		q: "Is it accurate?",
		a: "It is rebuilt from drawings and written records from the 1790s. Where nothing survives, we say so.",
	},
	{ q: "Who made this?", a: "Epocheye, a small team in Bengaluru, India." },
	{
		q: "Can I see the real palace?",
		a: "Yes. It is in Bangalore, and Epocheye works on site too.",
	},
];

export const FOOTER_LINE = "Epocheye Private Limited, Bengaluru.";

// Chapter text for the scroll journey, one per stop in lib/virtual/journey.js.
// Every line restates a claim the monument page (lib/monuments/tipu-summer-palace-bengaluru.js)
// marks "confirmed" or "unrecorded". Do not add claims here without a source there.
export const SCROLL_HINT = "Scroll to walk in";

// Context for visitors who have never heard of Tipu Sultan. The owner's wording, corrected with
// their approval to match the monument page: Hyder Ali began the palace and Tipu finished it.
export const CONTEXT =
	"Tipu Sultan ruled Mysore in southern India from 1782 to 1799. His father Hyder Ali began this teak palace inside Bangalore Fort and Tipu finished it. He was killed in 1799 defending his capital against the British East India Company.";

export const THEN_NOW = { title: "Then and now", today: "Today", then: "The 1790s, rebuilt" };
export const WALK_TITLE = "Walk through it";
export const HEAR_FIRST_STOP = "Hear the first stop";
export const FAQ_TITLE = "Questions";

export const FOUNDER = {
	title: "Who made this",
	name: "Sambit Singha",
	line: "Founder, Epocheye. Bengaluru, India.",
	// TODO(owner): two sentences about the founder, supplied by the owner.
	bio: null,
	// TODO(owner): LinkedIn profile URL.
	linkedin: null,
};
export const LOADER_LINE = "Rebuilding the palace";

export const CHAPTERS = {
	arrive: { nav: "Arrive", title: "Walk through it", body: "Scroll, and the walk begins: across the lawn, through the colonnade and into the hall." },
	lawn: {
		nav: "The front",
		title: "A house of teak",
		body: "Built inside the walls of Bangalore Fort, of teak on a low stone platform, open along its fronts as colonnades of clustered pillars and cusped arches.",
	},
	shade: {
		nav: "The colonnade",
		title: "Into the shade",
		body: "The teak shafts do not stand singly. They rise in clusters from shared stone bases, and the cusped arches spring from their capitals.",
	},
	pillars: {
		nav: "The pillars",
		title: "The colour that was lost",
		body: "In February 1792 James Hunter painted this front: pale walls, a blue-green trellis, arches outlined in salmon-red, pillars fluted in green and gold.",
	},
	stair: {
		nav: "The stair",
		title: "Up to the galleries",
		body: "Stairs of stone treads set into the wall, with timber balustrades, lead up to galleries that look down into the hall.",
	},
	hall: {
		nav: "The hall",
		title: "Two storeys, one room",
		body: "A galleried hall rises the full height of the building. Some of its pillars run straight past the gallery to the flat timber ceiling.",
	},
	ceiling: {
		nav: "The paint",
		title: "Where nothing survives, we say so",
		body: "The painting that survives is a pale floral pattern on a brick-red ground with a gold border. What was painted in each room is not recorded, so these walls follow the style, not a copy.",
	},
	dusk: { nav: "Early access", title: "This is the beginning", body: "The full walk has eight stops, narrated room by room." },
};

export const EVIDENCE_TOGGLE = "See what is recorded";
export const EVIDENCE_TOGGLE_OFF = "Back to the palace";
export const EVIDENCE_LEGEND = {
	recorded: "Recorded",
	today: "As it stands today",
	estimated: "Size estimated",
	style: "Style reconstructed",
	setting: "Setting",
};
