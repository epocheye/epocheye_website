import Link from "next/link";
import { preload } from "react-dom";

import JsonLd from "@/components/seo/JsonLd";
import { ORG_ID } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import {
	CHECKOUT_BUTTON,
	CHECKOUT_NOTE,
	CONSENT_LABEL,
	FAQ,
	FOOTER_LINE,
	SUBLINE,
	SUCCESS,
	TITLE,
	WAITLIST_BUTTON,
	WAITLIST_NOTE,
	WHAT_YOU_GET,
} from "@/lib/virtual/copy";
import WaitlistForm from "@/components/virtual/WaitlistForm";
import CheckoutButton from "@/components/virtual/CheckoutButton";
import PageViewTracker from "@/components/virtual/PageViewTracker";
import PalaceExperience from "@/components/virtual/experience/PalaceExperience";

// Standalone campaign page: a scroll-driven walk through the 3D reconstruction of the palace
// (components/virtual/experience), ending on early access. Also served at virtual.epocheye.com via
// the host rewrite in next.config.mjs. Not linked from the nav, footer, homepage or sitemap.

const PATH = "/virtual";

export const metadata = {
	title: TITLE,
	description: SUBLINE,
	alternates: { canonical: PATH },
	openGraph: {
		type: "website",
		url: PATH,
		siteName: "Epocheye",
		title: TITLE,
		description: SUBLINE,
	},
	twitter: {
		card: "summary_large_image",
		site: "@epocheyeinc",
		title: TITLE,
		description: SUBLINE,
	},
};

// Read at build time: changing either env var needs a redeploy.
// If sales are switched on without a checkout URL, fall back to the waitlist.
function salesConfig() {
	const open = process.env.SALES_OPEN === "true";
	const checkoutUrl = (process.env.DODO_CHECKOUT_URL || "").trim();
	if (open && !/^https:\/\//.test(checkoutUrl)) {
		console.warn("[virtual] SALES_OPEN=true but DODO_CHECKOUT_URL is missing or not https; showing the waitlist.");
		return { open: false, checkoutUrl: "" };
	}
	return { open, checkoutUrl };
}

function webPage() {
	return {
		"@context": "https://schema.org",
		"@type": "WebPage",
		"@id": `${SITE_URL}${PATH}#webpage`,
		url: `${SITE_URL}${PATH}`,
		name: TITLE,
		description: SUBLINE,
		publisher: { "@id": ORG_ID },
		about: {
			"@type": "LandmarksOrHistoricalBuildings",
			name: "Tipu Sultan's Summer Palace",
			address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressCountry: "IN" },
		},
	};
}

const PILL =
	"inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:text-xs";
const CARD = "rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md";

function Cta({ sales }) {
	return sales.open ? (
		<CheckoutButton href={sales.checkoutUrl} label={CHECKOUT_BUTTON} note={CHECKOUT_NOTE} />
	) : (
		<WaitlistForm
			buttonLabel={WAITLIST_BUTTON}
			note={WAITLIST_NOTE}
			consentLabel={CONSENT_LABEL}
			successMessage={SUCCESS}
		/>
	);
}

// The end of the walk: dusk over the palace, then the ask.
function Finale({ sales }) {
	return (
		<div className="px-5 pb-10">
			<div className="mx-auto flex max-w-3xl flex-col items-center text-center">
				<span className={PILL}>Early access</span>
				<p className="mt-6 text-xl font-light leading-snug sm:text-3xl">{SUBLINE}</p>
				<div className="mt-8 flex w-full justify-center">
					<Cta sales={sales} />
				</div>
			</div>

			<section className="mx-auto mt-24 max-w-5xl">
				<div className="flex justify-center">
					<span className={PILL}>What you get</span>
				</div>
				<ul className="mt-8 grid gap-4 sm:grid-cols-3">
					{WHAT_YOU_GET.map((item) => (
						<li key={item} className={`${CARD} px-6 py-8 text-center text-lg font-light leading-snug`}>
							{item}
						</li>
					))}
				</ul>
			</section>

			<section className="mx-auto mt-24 max-w-2xl">
				<div className="flex justify-center">
					<span className={PILL}>Questions</span>
				</div>
				<div className="mt-8 flex flex-col gap-3">
					{FAQ.map(({ q, a }) => (
						<details key={q} className={`group ${CARD} px-6 py-5 open:bg-white/10`}>
							<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium [&::-webkit-details-marker]:hidden">
								{q}
								<span className="text-xl font-light text-white/60 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
									+
								</span>
							</summary>
							<p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{a}</p>
						</details>
					))}
				</div>
			</section>

			<footer className="mx-auto mt-24 flex max-w-5xl flex-col items-center gap-4 border-t border-white/10 pt-8 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/50 sm:flex-row sm:justify-between">
				<p>{FOOTER_LINE}</p>
				<nav aria-label="Legal" className="flex gap-6">
					<Link href="/privacy" className="hover:text-white">
						Privacy
					</Link>
					<Link href="/terms" className="hover:text-white">
						Terms
					</Link>
					<Link href="/refunds" className="hover:text-white">
						Refunds
					</Link>
				</nav>
			</footer>
		</div>
	);
}

export default function VirtualPage() {
	const sales = salesConfig();
	// Start the model download with the HTML instead of after three.js boots.
	preload("/virtual/palace.glb", { as: "fetch", crossOrigin: "anonymous" });
	return (
		<>
			<JsonLd data={webPage()} />
			<PageViewTracker />
			<PalaceExperience cta={<Finale sales={sales} />} />
		</>
	);
}
