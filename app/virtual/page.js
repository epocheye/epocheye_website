import Link from "next/link";

import JsonLd from "@/components/seo/JsonLd";
import { ORG_ID } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import {
	CHECKOUT_BUTTON,
	CHECKOUT_NOTE,
	CONSENT_LABEL,
	FAQ,
	FOOTER_LINE,
	HEADLINE,
	SUBLINE,
	SUCCESS,
	TITLE,
	WAITLIST_BUTTON,
	WAITLIST_NOTE,
	WHAT_YOU_GET,
} from "@/lib/virtual/copy";
import { RECONSTRUCTION, TODAY, WALKTHROUGH_VIDEO } from "@/lib/virtual/images";
import RevealSlider from "@/components/virtual/RevealSlider";
import WaitlistForm from "@/components/virtual/WaitlistForm";
import CheckoutButton from "@/components/virtual/CheckoutButton";
import PageViewTracker from "@/components/virtual/PageViewTracker";

// Standalone campaign page. Also served at virtual.epocheye.com via the host rewrite
// in next.config.mjs. Not linked from the nav, footer, homepage or sitemap.

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

function Eyebrow({ children }) {
	return (
		<p className="font-montserrat text-[11px] uppercase tracking-[0.25em] text-white/40">{children}</p>
	);
}

function VideoSlot() {
	if (WALKTHROUGH_VIDEO) {
		return (
			<video
				className="aspect-video w-full rounded-2xl border border-white/10 bg-[#0d0d0d] object-cover"
				controls
				playsInline
				preload="none"
				poster={WALKTHROUGH_VIDEO.poster}>
				<source src={WALKTHROUGH_VIDEO.webm} type="video/webm" />
				<source src={WALKTHROUGH_VIDEO.mp4} type="video/mp4" />
			</video>
		);
	}
	return (
		<div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#0d0d0d] p-6 text-center">
			<p className="font-mono text-xs leading-relaxed text-white/50">
				EMPTY SLOT: walkthrough video
				<br />
				public/virtual/walkthrough.mp4 + .webm + walkthrough-poster.jpg
				<br />
				Set WALKTHROUGH_VIDEO in lib/virtual/images.js
			</p>
		</div>
	);
}

export default function VirtualPage() {
	const sales = salesConfig();

	return (
		<main className="min-h-screen bg-[#080808] text-white">
			<JsonLd data={webPage()} />
			<PageViewTracker />

			{/* 1. Hero */}
			<section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-16 pt-8 sm:gap-8 sm:px-6 sm:pt-12">
				<p className="font-montserrat text-sm font-semibold tracking-tight text-white/80">Epocheye</p>
				<h1 className="font-montserrat text-[1.65rem] font-light leading-[1.2] tracking-tight sm:text-4xl md:text-5xl">
					{HEADLINE}
				</h1>
				<RevealSlider before={TODAY} after={RECONSTRUCTION} priority />
				<p className="max-w-2xl font-instrument-sans text-base leading-relaxed text-white/70 sm:text-lg">
					{SUBLINE}
				</p>
				{sales.open ? (
					<CheckoutButton href={sales.checkoutUrl} label={CHECKOUT_BUTTON} note={CHECKOUT_NOTE} />
				) : (
					<WaitlistForm
						buttonLabel={WAITLIST_BUTTON}
						note={WAITLIST_NOTE}
						consentLabel={CONSENT_LABEL}
						successMessage={SUCCESS}
					/>
				)}
			</section>

			{/* 2. What you get */}
			<section className="border-t border-white/5">
				<div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
					<Eyebrow>What you get</Eyebrow>
					<ul className="mt-8 grid gap-4 sm:grid-cols-3">
						{WHAT_YOU_GET.map((item) => (
							<li
								key={item}
								className="rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 font-instrument-serif text-xl leading-snug text-white/90">
								{item}
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* 3. Video slot */}
			<VideoSlotSection />

			{/* 4. FAQ */}
			<section className="border-t border-white/5">
				<div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
					<Eyebrow>Questions</Eyebrow>
					<div className="mt-6 divide-y divide-white/5 border-y border-white/5">
						{FAQ.map(({ q, a }) => (
							<details key={q} className="group py-5">
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-montserrat text-base text-white">
									{q}
									<span className="text-white/40 transition-transform group-open:rotate-45" aria-hidden="true">
										+
									</span>
								</summary>
								<p className="mt-3 font-instrument-sans leading-relaxed text-white/60">{a}</p>
							</details>
						))}
					</div>
				</div>
			</section>

			{/* 5. Footer */}
			<footer className="border-t border-white/5">
				<div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 font-instrument-sans text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<p>{FOOTER_LINE}</p>
					<nav aria-label="Legal" className="flex gap-6">
						<Link href="/privacy" className="hover:text-white/80">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-white/80">
							Terms
						</Link>
						<Link href="/refunds" className="hover:text-white/80">
							Refunds
						</Link>
					</nav>
				</div>
			</footer>
		</main>
	);
}

function VideoSlotSection() {
	// Labelled placeholder on local and preview builds only; production hides the empty slot.
	if (!WALKTHROUGH_VIDEO && process.env.VERCEL_ENV === "production") return null;
	return (
		<section className="border-t border-white/5">
			<div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
				<VideoSlot />
			</div>
		</section>
	);
}
