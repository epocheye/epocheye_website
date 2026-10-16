import Link from "next/link";

import JsonLd from "@/components/seo/JsonLd";
import { ORG_ID } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import {
	CHECKOUT_BUTTON,
	CHECKOUT_NOTE,
	CONSENT_LABEL,
	CONTEXT,
	FAQ,
	FAQ_TITLE,
	FOOTER_LINE,
	FOUNDER,
	HEADLINE_LEAD,
	HEADLINE_TURN,
	SUBLINE,
	SUCCESS,
	THEN_NOW,
	TITLE,
	WAITLIST_BUTTON,
	WAITLIST_NOTE,
	WHAT_YOU_GET,
	WHAT_YOU_GET_TITLE,
} from "@/lib/virtual/copy";
import { FOUNDER_PHOTO, HERO_POSTER, HERO_VIDEO, STILLS, THEN_NOW_IMAGES, showSlots } from "@/lib/virtual/media";
import WaitlistForm from "@/components/virtual/WaitlistForm";
import CheckoutButton from "@/components/virtual/CheckoutButton";
import PageViewTracker from "@/components/virtual/PageViewTracker";
import Header from "@/components/virtual/Header";
import StickyCta from "@/components/virtual/StickyCta";
import ThenNow from "@/components/virtual/ThenNow";
import Walk from "@/components/virtual/experience/Walk";
import { ArchClipDefs, ArchDivider, ArchMark } from "@/components/virtual/ornament";
import { ParallaxImage, Reveal } from "@/components/virtual/motion";

// Standalone campaign page, designed as a museum catalogue for the palace: light lime-white page,
// the palette of Hunter's 1792 painting (salmon-red, blue-green, gold, teak), a display serif,
// full-bleed images, one ornament (the cusped arch). Opens on the hero video and the then/now
// slider; the 3D walk follows. Also served at virtual.epocheye.com via the host rewrite in
// next.config.mjs. Not linked from the nav, footer, homepage or sitemap.

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

// The global overflow-x: hidden on body breaks position: sticky, which the walk needs.
// clip hides horizontal overflow the same way without making body a scroll container.
const PAGE_CSS = "html,body{overflow-x:clip}";

function Slot({ children, className = "" }) {
	return <p className={`font-mono text-[11px] leading-relaxed ${className}`}>{children}</p>;
}

function Hero({ sales, slots }) {
	const video = HERO_VIDEO.desktop || HERO_VIDEO.mobile;
	return (
		<section id="hero" className="relative flex h-svh min-h-[640px] w-full items-end overflow-hidden bg-[#2e1f16] text-white">
			<picture>
				<source media="(max-aspect-ratio: 4/5)" srcSet={HERO_POSTER.mobile} />
				<img src={HERO_POSTER.desktop} alt={HERO_POSTER.alt} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
			</picture>
			{video ? (
				<video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="metadata" poster={HERO_POSTER.desktop} aria-hidden="true">
					{HERO_VIDEO.mobile ? <source media="(max-aspect-ratio: 4/5)" src={HERO_VIDEO.mobile.webm} type="video/webm" /> : null}
					{HERO_VIDEO.mobile ? <source media="(max-aspect-ratio: 4/5)" src={HERO_VIDEO.mobile.mp4} type="video/mp4" /> : null}
					{HERO_VIDEO.desktop ? <source src={HERO_VIDEO.desktop.webm} type="video/webm" /> : null}
					{HERO_VIDEO.desktop ? <source src={HERO_VIDEO.desktop.mp4} type="video/mp4" /> : null}
				</video>
			) : null}
			<div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-black/0" aria-hidden="true" />
			{slots && !video ? (
				<Slot className="absolute right-5 top-20 max-w-[16rem] text-right text-white/80">
					SLOT: hero video, muted loop. 16:9 hero-16x9.mp4/.webm, 9:16 hero-9x16.mp4/.webm. The poster is a render from the model.
				</Slot>
			) : null}

			<div className="relative mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8 sm:pb-16">
				<h1 className="max-w-4xl font-instrument-serif text-[2.6rem] leading-[1.02] sm:text-7xl lg:text-[5.5rem]">
					{HEADLINE_LEAD} <em className="text-[#f2d5b8]">{HEADLINE_TURN}</em>
				</h1>
				<p className="mt-5 max-w-xl font-instrument-sans text-base leading-relaxed text-white/85 sm:text-lg">{SUBLINE}</p>
				<div className="mt-8">
					{sales.open ? (
						<CheckoutButton href={sales.checkoutUrl} label={CHECKOUT_BUTTON} note={CHECKOUT_NOTE} />
					) : (
						<WaitlistForm onDark buttonLabel={WAITLIST_BUTTON} note={WAITLIST_NOTE} consentLabel={CONSENT_LABEL} successMessage={SUCCESS} />
					)}
				</div>
			</div>
		</section>
	);
}

function ThenNowSection({ slots }) {
	return (
		<section aria-label={THEN_NOW.title} className="bg-[#f4efe6]">
			<ThenNow today={THEN_NOW_IMAGES.today} then={THEN_NOW_IMAGES.then} labels={THEN_NOW} showSlots={slots} />
			<Reveal className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
				<h2 className="font-instrument-serif text-3xl text-[#2e1f16] sm:text-4xl">{THEN_NOW.title}</h2>
			</Reveal>
		</section>
	);
}

function ContextBand() {
	return (
		<section className="bg-[#ebe3d4]">
			<ParallaxImage src={STILLS.context.src} alt={STILLS.context.alt} className="h-[52svh] sm:h-[68svh]" />
			<Reveal className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-24">
				<ArchDivider />
				<p className="mt-8 font-instrument-serif text-2xl leading-snug text-[#2e1f16] sm:text-[2.6rem] sm:leading-[1.2]">{CONTEXT}</p>
			</Reveal>
		</section>
	);
}

function WhatYouGet() {
	return (
		<section className="bg-[#f4efe6]">
			<ParallaxImage src={STILLS.whatYouGet.src} alt={STILLS.whatYouGet.alt} className="h-[56svh] sm:h-[78svh]" />
			<div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
				<Reveal>
					<h2 className="font-instrument-serif text-4xl text-[#2e1f16] sm:text-6xl">{WHAT_YOU_GET_TITLE}</h2>
				</Reveal>
				<ul className="border-t border-[#2e1f16]/15">
					{WHAT_YOU_GET.map((item, i) => (
						<li key={item} className="border-b border-[#2e1f16]/15">
							<Reveal delay={i * 0.08} className="flex items-baseline gap-5 py-6">
								<ArchMark width={20} className="shrink-0" />
								<span className="font-instrument-serif text-2xl leading-snug text-[#2e1f16] sm:text-3xl">{item}</span>
							</Reveal>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}

function Founder({ slots }) {
	const name = FOUNDER.linkedin ? (
		<a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer" className="underline decoration-[#c0614a]/40 underline-offset-4 hover:decoration-[#c0614a]">
			{FOUNDER.name}
		</a>
	) : (
		FOUNDER.name
	);
	return (
		<section className="bg-[#ebe3d4]">
			<ArchClipDefs id="arch-frame" />
			<div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[minmax(0,420px)_1fr] md:gap-16">
				<Reveal>
					<div className="relative aspect-[4/5] w-full overflow-hidden bg-[#d9cdb6]" style={{ clipPath: "url(#arch-frame)" }}>
						{FOUNDER_PHOTO ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={FOUNDER_PHOTO.src} alt={FOUNDER_PHOTO.alt} className="absolute inset-0 h-full w-full object-cover" />
						) : slots ? (
							<Slot className="absolute inset-x-6 bottom-8 text-center text-[#5c4636]">SLOT: founder portrait. public/virtual/founder.jpg, 1200px or larger</Slot>
						) : null}
					</div>
				</Reveal>
				<Reveal delay={0.1}>
					<p className="font-instrument-serif text-xl italic text-[#3f7f78]">{FOUNDER.title}</p>
					<h2 className="mt-3 font-instrument-serif text-4xl text-[#2e1f16] sm:text-6xl">{name}</h2>
					<p className="mt-3 font-instrument-sans text-base text-[#5c4636]">{FOUNDER.line}</p>
					{FOUNDER.bio ? (
						<p className="mt-6 max-w-xl font-instrument-serif text-2xl leading-snug text-[#2e1f16]">{FOUNDER.bio}</p>
					) : slots ? (
						<Slot className="mt-6 text-[#5c4636]">TODO: two sentences from the owner (FOUNDER.bio) and the LinkedIn URL (FOUNDER.linkedin) in lib/virtual/copy.js</Slot>
					) : null}
				</Reveal>
			</div>
		</section>
	);
}

function Questions() {
	return (
		<section className="bg-[#f4efe6]">
			<ParallaxImage src={STILLS.faq.src} alt={STILLS.faq.alt} className="h-[40svh] sm:h-[56svh]" />
			<div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.4fr]">
				<Reveal>
					<h2 className="font-instrument-serif text-4xl text-[#2e1f16] sm:text-6xl">{FAQ_TITLE}</h2>
				</Reveal>
				<div className="border-t border-[#2e1f16]/15">
					{FAQ.map(({ q, a }) => (
						<details key={q} className="group border-b border-[#2e1f16]/15 py-6">
							<summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 font-instrument-serif text-2xl text-[#2e1f16] sm:text-3xl [&::-webkit-details-marker]:hidden">
								{q}
								<span className="font-instrument-sans text-2xl font-light text-[#c0614a] transition-transform duration-500 group-open:rotate-45" aria-hidden="true">
									+
								</span>
							</summary>
							<p className="mt-4 max-w-2xl font-instrument-sans text-base leading-relaxed text-[#5c4636] sm:text-lg">{a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="bg-[#2e1f16] pb-28 text-[#f4efe6] sm:pb-0">
			<div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
				<ArchDivider />
				<div className="mt-10 flex flex-col items-center justify-between gap-6 font-instrument-sans text-sm text-[#f4efe6]/70 sm:flex-row">
					<p className="font-instrument-serif text-xl text-[#f4efe6]">{FOOTER_LINE}</p>
					<nav aria-label="Legal" className="flex gap-8">
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
			</div>
		</footer>
	);
}

export default function VirtualPage() {
	const sales = salesConfig();
	const slots = showSlots();
	const ctaLabel = sales.open ? CHECKOUT_BUTTON : WAITLIST_BUTTON;
	return (
		<div className="bg-[#f4efe6] text-[#2e1f16]">
			<style>{PAGE_CSS}</style>
			<JsonLd data={webPage()} />
			<PageViewTracker />
			<Header label={ctaLabel} />
			<main>
				<Hero sales={sales} slots={slots} />
				<ThenNowSection slots={slots} />
				<ContextBand />
				<Walk showSlots={slots} ctaLabel={ctaLabel} />
				<WhatYouGet />
				<Founder slots={slots} />
				<Questions />
			</main>
			<Footer />
			<StickyCta label={ctaLabel} />
		</div>
	);
}
