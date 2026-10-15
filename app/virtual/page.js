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
	HEADLINE_LEAD,
	HEADLINE_TURN,
	SUBLINE,
	SUCCESS,
	TITLE,
	WAITLIST_BUTTON,
	WAITLIST_NOTE,
	WHAT_YOU_GET,
} from "@/lib/virtual/copy";
import { HERO_VIDEO, STORY_IS_PREVIEW, STORY_VIDEO } from "@/lib/virtual/media";
import WaitlistForm from "@/components/virtual/WaitlistForm";
import CheckoutButton from "@/components/virtual/CheckoutButton";
import PageViewTracker from "@/components/virtual/PageViewTracker";
import StoryVideo from "@/components/virtual/StoryVideo";
import FadeUp from "@/components/virtual/FadeUp";

// Standalone campaign page, built in the main site's Hero language: full-bleed footage under a
// dark overlay, centred Montserrat Alternates, glass pills. Also served at virtual.epocheye.com
// via the host rewrite in next.config.mjs. Not linked from the nav, footer, homepage or sitemap.

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
	"inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-montserrat text-[11px] font-medium uppercase tracking-[0.18em] text-white backdrop-blur-sm sm:text-xs";

function Caption({ children }) {
	return <span className={PILL}>{children}</span>;
}

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

export default function VirtualPage() {
	const sales = salesConfig();

	return (
		<main className="bg-black font-montserrat text-white">
			<JsonLd data={webPage()} />
			<PageViewTracker />

			{/* 1. Hero: the painted ceiling coming back, under the headline and the form. */}
			<section className="relative flex min-h-svh items-center justify-center overflow-hidden">
				<video
					className="absolute inset-0 h-full w-full object-cover object-[50%_60%]"
					autoPlay
					loop
					muted
					playsInline
					preload="metadata"
					poster={HERO_VIDEO.poster}
					aria-hidden="true">
					<source src={HERO_VIDEO.webm} type="video/webm" />
					<source src={HERO_VIDEO.mp4} type="video/mp4" />
				</video>
				<div className="absolute inset-0 bg-black/55" aria-hidden="true" />
				<div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-black" aria-hidden="true" />

				<p className="absolute left-5 top-6 z-10 text-xl font-bold tracking-tight sm:left-8 sm:top-8 sm:text-2xl">
					Epocheye
				</p>

				<div className="relative z-10 mx-auto flex max-w-sm flex-col items-center px-5 py-24 text-center sm:max-w-2xl md:max-w-3xl">
					<h1 className="text-[1.75rem] font-light leading-[1.18] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
						{HEADLINE_LEAD}
						<br />
						<span className="font-semibold">{HEADLINE_TURN}</span>
					</h1>
					<p className="mt-6 max-w-xl text-sm font-medium leading-relaxed text-white/70 sm:mt-8 sm:text-lg">
						{SUBLINE}
					</p>
					<div className="mt-8 flex w-full justify-center sm:mt-10">
						<Cta sales={sales} />
					</div>
				</div>

				<div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 opacity-50" aria-hidden="true">
					<div className="h-12 w-px bg-linear-to-b from-transparent via-white to-transparent" />
				</div>
			</section>

			{/* 2. What you get */}
			<section className="px-5 py-20 sm:py-28">
				<FadeUp className="mx-auto flex max-w-5xl flex-col items-center text-center">
					<Caption>What you get</Caption>
					<ul className="mt-10 grid w-full gap-4 sm:grid-cols-3">
						{WHAT_YOU_GET.map((item, i) => (
							<li key={item} className="list-none">
								<FadeUp
									delay={0.1 * i}
									className="h-full rounded-3xl border border-white/15 bg-white/5 px-6 py-8 text-lg font-light leading-snug text-white backdrop-blur-sm sm:text-xl">
									{item}
								</FadeUp>
							</li>
						))}
					</ul>
				</FadeUp>
			</section>

			{/* 3. The story: the Blender film of the palace and the fort around it. */}
			<section className="px-5 pb-20 sm:pb-28">
				<FadeUp className="mx-auto flex max-w-xl flex-col items-center text-center">
					<Caption>The story</Caption>
					<div className="mt-10 w-full">
						<StoryVideo video={STORY_VIDEO} />
					</div>
					{STORY_IS_PREVIEW && process.env.VERCEL_ENV !== "production" ? (
						<p className="mt-3 font-mono text-[11px] text-white/40">
							Preview render. Swap in the final film (see lib/virtual/media.js).
						</p>
					) : null}
				</FadeUp>
			</section>

			{/* 4. FAQ */}
			<section className="px-5 pb-20 sm:pb-28">
				<FadeUp className="mx-auto flex max-w-2xl flex-col items-center">
					<Caption>Questions</Caption>
					<div className="mt-10 flex w-full flex-col gap-3">
						{FAQ.map(({ q, a }) => (
							<details
								key={q}
								className="group rounded-3xl border border-white/15 bg-white/5 px-6 py-5 backdrop-blur-sm open:bg-white/10">
								<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-white [&::-webkit-details-marker]:hidden">
									{q}
									<span
										className="text-xl font-light text-white/60 transition-transform duration-300 group-open:rotate-45"
										aria-hidden="true">
										+
									</span>
								</summary>
								<p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{a}</p>
							</details>
						))}
					</div>
				</FadeUp>
			</section>

			{/* 5. Footer */}
			<footer className="border-t border-white/10 px-5 py-10">
				<div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/50 sm:flex-row sm:justify-between">
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
				</div>
			</footer>
		</main>
	);
}
