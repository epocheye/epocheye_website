import Link from "next/link";
import Image from "next/image";

import JsonLd from "@/components/seo/JsonLd";
import { ORG_ID } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site";
import {
	CHAPTERS,
	CHECKOUT_BUTTON,
	CHECKOUT_NOTE,
	CONSENT_LABEL,
	CONTEXT,
	EVIDENCE_LEGEND,
	EVIDENCE_TOGGLE,
	EVIDENCE_TOGGLE_OFF,
	FAQ,
	FAQ_TITLE,
	FOOTER_LINE,
	FOUNDER,
	HEADLINE_LEAD,
	HEADLINE_TURN,
	HEAR_FIRST_STOP,
	LOADER_LINE,
	SCROLL_HINT,
	SUBLINE,
	SUCCESS,
	THEN_NOW,
	TITLE,
	WAITLIST_BUTTON,
	WAITLIST_NOTE,
	WHAT_YOU_GET,
	WHAT_YOU_GET_TITLE,
} from "@/lib/virtual/copy";
import { STOPS } from "@/lib/virtual/journey";
import { FIRST_STOP_AUDIO, FOUNDER_PHOTO, HERO_POSTER, HUNTER_PAINTING, THEN_NOW_IMAGES, showSlots } from "@/lib/virtual/media";
import WaitlistForm from "@/components/virtual/WaitlistForm";
import CheckoutButton from "@/components/virtual/CheckoutButton";
import PageViewTracker from "@/components/virtual/PageViewTracker";
import Header from "@/components/virtual/Header";
import StickyCta from "@/components/virtual/StickyCta";
import ThenNow from "@/components/virtual/ThenNow";
import AudioButton from "@/components/virtual/AudioButton";
import RevealText from "@/components/virtual/RevealText";
import Stage from "@/components/virtual/experience/Stage";
import { ArchClipDefs, ArchDivider, ArchMark } from "@/components/virtual/ornament";
import { Reveal } from "@/components/virtual/motion";

// Standalone campaign page: a scroll-driven walk through the 3D palace at dusk. The palace is a
// fixed full-screen layer (Stage); the page scrolls over it in "beats", each tagged with the camera
// position it stands for. The early-access form follows the opening and closes the walk; solid
// sections after the walk carry the rest. Also served at virtual.epocheye.com via the host rewrite
// in next.config.mjs. Not linked from the nav, footer, homepage or sitemap.

const PATH = "/virtual";
const GOLD = "#d4a85a";

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

// overflow-x: clip, not hidden, on html/body: hidden makes body a scroll container, which breaks
// sticky and fixed layers. Grain is an SVG noise tile; the loading bar slides while the 3D loads.
const PAGE_CSS = `html,body{overflow-x:clip;background:#0b0907}
.virtual-grain{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:virtual-grain 0.9s steps(3) infinite}
@keyframes virtual-grain{0%{transform:translate(0,0)}33%{transform:translate(-3%,2%)}66%{transform:translate(2%,-3%)}100%{transform:translate(0,0)}}
.virtual-loading{animation:virtual-loading 1.4s ease-in-out infinite}
@keyframes virtual-loading{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
.virtual-hint{animation:virtual-hint 2.4s cubic-bezier(.22,1,.36,1) infinite;transform-origin:top}
@keyframes virtual-hint{0%{transform:scaleY(0);opacity:1}60%{transform:scaleY(1);opacity:1}100%{transform:scaleY(1);opacity:0}}
@media (prefers-reduced-motion:reduce){.virtual-grain,.virtual-hint{animation:none}}`;

function Slot({ children, className = "" }) {
	return <p className={`font-mono text-[11px] leading-relaxed text-[#f3e9d8]/60 ${className}`}>{children}</p>;
}

// A scroll beat over the 3D layer. `t` is the camera position it stands for, in chapters.
function Beat({ t, chapter, id, className = "", children }) {
	return (
		<section id={id} data-beat="" data-t={t} data-chapter={chapter} className={`relative flex w-full ${className}`}>
			{children}
		</section>
	);
}

// A soft dark pool behind words over the 3D, so they read over bright sky or lamplight.
function Shade({ className = "" }) {
	return <div className={`pointer-events-none absolute -z-10 bg-[radial-gradient(closest-side,rgba(8,5,3,0.7),rgba(8,5,3,0))] ${className}`} aria-hidden="true" />;
}

function Signup({ id, sales }) {
	return sales.open ? (
		<CheckoutButton id={id} href={sales.checkoutUrl} label={CHECKOUT_BUTTON} note={CHECKOUT_NOTE} />
	) : (
		<WaitlistForm id={id} onDark buttonLabel={WAITLIST_BUTTON} note={WAITLIST_NOTE} consentLabel={CONSENT_LABEL} successMessage={SUCCESS} />
	);
}

const HEADING = "font-instrument-serif font-normal leading-[0.98] tracking-[-0.01em] text-[#f3e9d8]";

function Opening() {
	return (
		<Beat t={0} chapter="arrive" id="hero" className="h-svh min-h-[640px] items-end">
			<div className="relative mx-auto w-full max-w-[1600px] px-5 pb-28 sm:px-10 sm:pb-32">
				<Shade className="-inset-x-10 -inset-y-24 sm:-inset-x-24" />
				<h1 className={`${HEADING} max-w-[16ch] text-[clamp(2.7rem,min(6vw,10svh),7rem)]`}>
					<RevealText as="span" text={HEADLINE_LEAD} className="block" stagger={0.06} delay={0.2} />
					<RevealText as="span" text={HEADLINE_TURN} className="block italic text-[#e9c08a]" stagger={0.06} delay={0.7} />
				</h1>
				<Reveal delay={1.3}>
					<p className="mt-7 max-w-xl font-instrument-sans text-base leading-relaxed text-[#f3e9d8]/80 sm:text-lg">{SUBLINE}</p>
				</Reveal>
			</div>
			<div className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-3" aria-hidden="true">
				<span className="font-instrument-sans text-xs text-[#f3e9d8]/60">{SCROLL_HINT}</span>
				<span className="relative block h-10 w-px overflow-hidden bg-[#f3e9d8]/15">
					<span className="virtual-hint absolute inset-0 bg-[#d4a85a]" />
				</span>
			</div>
		</Beat>
	);
}

function Join({ sales }) {
	const copy = CHAPTERS.arrive;
	return (
		<Beat t={0.35} chapter="arrive-join" className="min-h-[115svh] items-center">
			<div className="relative mx-auto w-full max-w-[1600px] px-5 sm:px-10">
				<div className="relative max-w-xl">
					<Shade className="-inset-x-16 -inset-y-20" />
					<RevealText as="h2" text={copy.title} className={`${HEADING} text-[clamp(2.4rem,5vw,4.8rem)]`} />
					<Reveal delay={0.3}>
						<p className="mt-5 font-instrument-sans text-base leading-relaxed text-[#f3e9d8]/80 sm:text-lg">{copy.body}</p>
					</Reveal>
					<Reveal delay={0.5} className="mt-9">
						<Signup id="early-access-top" sales={sales} />
					</Reveal>
				</div>
			</div>
		</Beat>
	);
}

function Context() {
	return (
		<Beat t={0.75} chapter="arrive-context" className="min-h-[125svh] items-center justify-center">
			<div className="relative mx-auto max-w-5xl px-6 text-center">
				<Shade className="-inset-x-20 -inset-y-24" />
				<Reveal>
					<ArchDivider tone={GOLD} />
				</Reveal>
				<RevealText text={CONTEXT} className={`${HEADING} mt-10 text-[clamp(1.7rem,3.3vw,3.2rem)] leading-[1.18]`} stagger={0.02} />
			</div>
		</Beat>
	);
}

const WALK = ["lawn", "shade", "pillars", "hall", "ceiling", "stair"];

function Chapter({ id, t, side, slots }) {
	const copy = CHAPTERS[id];
	const right = side === "right";
	return (
		<Beat t={t} chapter={id} className="min-h-[140svh] items-center">
			<div className={`relative mx-auto flex w-full max-w-[1600px] px-5 sm:px-10 ${right ? "lg:justify-end lg:pr-40" : ""}`}>
				<div className="relative max-w-xl">
					<Shade className="-inset-x-16 -inset-y-20" />
					<Reveal>
						<p className="font-instrument-serif text-xl italic text-[#d4a85a]">{copy.nav}</p>
					</Reveal>
					<RevealText as="h2" text={copy.title} className={`${HEADING} mt-3 text-[clamp(2.4rem,5.4vw,5.4rem)]`} />
					<Reveal delay={0.25}>
						<p className="mt-6 font-instrument-sans text-base leading-relaxed text-[#f3e9d8]/80 sm:text-lg">{copy.body}</p>
					</Reveal>
					<Reveal delay={0.4}>
						<ChapterExtra id={id} slots={slots} />
					</Reveal>
				</div>
			</div>
		</Beat>
	);
}

function ChapterExtra({ id, slots }) {
	if (id === "lawn") {
		return (
			<div className="mt-8">
				<AudioButton src={FIRST_STOP_AUDIO} label={HEAR_FIRST_STOP} showSlots={slots} />
			</div>
		);
	}
	if (id === "pillars") {
		if (HUNTER_PAINTING) {
			return (
				<figure className="mt-8">
					<div className="relative aspect-[4/3] w-full max-w-sm overflow-hidden">
						<Image src={HUNTER_PAINTING.src} alt={HUNTER_PAINTING.alt} fill sizes="380px" className="object-cover" />
					</div>
					<figcaption className="mt-2 font-instrument-sans text-xs text-[#f3e9d8]/60">{HUNTER_PAINTING.credit}</figcaption>
				</figure>
			);
		}
		return slots ? (
			<div className="mt-8 flex aspect-[4/3] w-full max-w-sm items-center justify-center border border-dashed border-[#d4a85a]/50 p-4 text-center">
				<Slot>SLOT: James Hunter, 1792, this front. public/virtual/hunter-1792.jpg + credit line in lib/virtual/media.js</Slot>
			</div>
		) : null;
	}
	return null;
}

function Close({ sales }) {
	const copy = CHAPTERS.dusk;
	return (
		<Beat t={STOPS.length - 1} chapter="dusk" className="min-h-[150svh] items-center justify-center">
			<div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
				<Shade className="-inset-x-20 -inset-y-24" />
				<Reveal>
					<ArchDivider tone={GOLD} />
				</Reveal>
				<RevealText as="h2" text={copy.title} className={`${HEADING} mt-8 text-[clamp(2.6rem,6vw,6rem)]`} />
				<Reveal delay={0.3}>
					<p className="mt-6 font-instrument-sans text-base leading-relaxed text-[#f3e9d8]/80 sm:text-lg">{copy.body}</p>
				</Reveal>
				<Reveal delay={0.5} className="mt-10 flex w-full justify-center text-left">
					<Signup id="early-access" sales={sales} />
				</Reveal>
			</div>
		</Beat>
	);
}

function ThenNowSection({ slots }) {
	if ((!THEN_NOW_IMAGES.today || !THEN_NOW_IMAGES.then) && !slots) return null;
	return (
		<section aria-label={THEN_NOW.title} className="mx-auto max-w-[1600px] px-5 pt-28 sm:px-10 sm:pt-40">
			<RevealText as="h2" text={THEN_NOW.title} className={`${HEADING} mb-10 text-[clamp(2.4rem,5vw,4.8rem)]`} />
			<ThenNow today={THEN_NOW_IMAGES.today} then={THEN_NOW_IMAGES.then} labels={THEN_NOW} showSlots={slots} />
		</section>
	);
}

function WhatYouGet() {
	return (
		<section className="mx-auto grid max-w-[1600px] gap-12 px-5 py-28 sm:px-10 sm:py-40 lg:grid-cols-[1fr_1.4fr]">
			<RevealText as="h2" text={WHAT_YOU_GET_TITLE} className={`${HEADING} text-[clamp(2.6rem,5.6vw,5.6rem)]`} />
			<ul className="border-t border-[#f3e9d8]/15">
				{WHAT_YOU_GET.map((item, i) => (
					<li key={item} className="border-b border-[#f3e9d8]/15">
						<Reveal delay={i * 0.08} className="flex items-baseline gap-5 py-7">
							<ArchMark width={20} stroke={GOLD} className="shrink-0" />
							<span className="font-instrument-serif text-2xl leading-snug text-[#f3e9d8] sm:text-3xl">{item}</span>
						</Reveal>
					</li>
				))}
			</ul>
		</section>
	);
}

function Founder({ slots }) {
	const name = FOUNDER.linkedin ? (
		<a href={FOUNDER.linkedin} target="_blank" rel="noopener noreferrer" className="underline decoration-[#d4a85a]/40 underline-offset-8 hover:decoration-[#d4a85a]">
			{FOUNDER.name}
		</a>
	) : (
		FOUNDER.name
	);
	return (
		<section className="border-t border-[#f3e9d8]/10">
			<ArchClipDefs id="arch-frame" />
			<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-28 sm:px-10 sm:py-40 md:grid-cols-[minmax(0,400px)_1fr] md:gap-20">
				<Reveal>
					<div className="relative aspect-[4/5] w-full overflow-hidden bg-[#1c150f]" style={{ clipPath: "url(#arch-frame)" }}>
						{FOUNDER_PHOTO ? (
							<Image src={FOUNDER_PHOTO.src} alt={FOUNDER_PHOTO.alt} fill sizes="400px" className="object-cover" />
						) : slots ? (
							<Slot className="absolute inset-x-6 bottom-8 text-center">SLOT: founder portrait. public/virtual/founder.jpg, 1200px or larger</Slot>
						) : null}
					</div>
				</Reveal>
				<Reveal delay={0.1}>
					<p className="font-instrument-serif text-xl italic text-[#d4a85a]">{FOUNDER.title}</p>
					<h2 className={`${HEADING} mt-3 text-[clamp(2.6rem,5vw,4.8rem)]`}>{name}</h2>
					<p className="mt-4 font-instrument-sans text-base text-[#f3e9d8]/70">{FOUNDER.line}</p>
					{FOUNDER.bio ? (
						<p className="mt-6 max-w-xl font-instrument-serif text-2xl leading-snug text-[#f3e9d8]">{FOUNDER.bio}</p>
					) : slots ? (
						<Slot className="mt-6">TODO: two sentences from the owner (FOUNDER.bio) and the LinkedIn URL (FOUNDER.linkedin) in lib/virtual/copy.js</Slot>
					) : null}
				</Reveal>
			</div>
		</section>
	);
}

function Questions() {
	return (
		<section className="border-t border-[#f3e9d8]/10">
			<div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-28 sm:px-10 sm:py-40 lg:grid-cols-[1fr_1.4fr]">
				<RevealText as="h2" text={FAQ_TITLE} className={`${HEADING} text-[clamp(2.6rem,5.6vw,5.6rem)]`} />
				<div className="border-t border-[#f3e9d8]/15">
					{FAQ.map(({ q, a }) => (
						<details key={q} className="group border-b border-[#f3e9d8]/15 py-7">
							<summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 font-instrument-serif text-2xl text-[#f3e9d8] sm:text-3xl [&::-webkit-details-marker]:hidden">
								{q}
								<span className="font-instrument-sans text-2xl font-light text-[#d4a85a] transition-transform duration-500 group-open:rotate-45" aria-hidden="true">
									+
								</span>
							</summary>
							<p className="mt-4 max-w-2xl font-instrument-sans text-base leading-relaxed text-[#f3e9d8]/70 sm:text-lg">{a}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-[#f3e9d8]/10 pb-28 sm:pb-0">
			<div className="mx-auto max-w-[1600px] px-5 py-16 sm:px-10">
				<ArchDivider tone={GOLD} />
				<div className="mt-10 flex flex-col items-center justify-between gap-6 font-instrument-sans text-sm text-[#f3e9d8]/60 sm:flex-row">
					<p className="font-instrument-serif text-xl text-[#f3e9d8]">{FOOTER_LINE}</p>
					<nav aria-label="Legal" className="flex gap-8">
						<Link href="/privacy" className="hover:text-[#f3e9d8]">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-[#f3e9d8]">
							Terms
						</Link>
						<Link href="/refunds" className="hover:text-[#f3e9d8]">
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
	const chapterNames = Object.fromEntries(Object.entries(CHAPTERS).map(([id, c]) => [id, c.nav]));
	return (
		<div className="bg-[#0b0907] text-[#f3e9d8]">
			<style>{PAGE_CSS}</style>
			<JsonLd data={webPage()} />
			<PageViewTracker />
			<Stage
				poster={HERO_POSTER}
				loaderLine={LOADER_LINE}
				chapters={chapterNames}
				evidenceLabels={{ on: EVIDENCE_TOGGLE, off: EVIDENCE_TOGGLE_OFF, legend: EVIDENCE_LEGEND }}
			/>
			<Header label={ctaLabel} />
			<main className="relative z-10">
				<div id="walk" aria-label="Walk through the palace">
					<Opening />
					<Join sales={sales} />
					<Context />
					{WALK.map((id, i) => (
						<Chapter key={id} id={id} t={i + 1} side={i % 2 ? "right" : "left"} slots={slots} />
					))}
					<Close sales={sales} />
				</div>
				<div id="walk-end" className="h-px" aria-hidden="true" />
				<div className="relative bg-[#0b0907]">
					<div className="pointer-events-none absolute inset-x-0 -top-64 h-64 bg-linear-to-b from-transparent to-[#0b0907]" aria-hidden="true" />
					<ThenNowSection slots={slots} />
					<WhatYouGet />
					<Founder slots={slots} />
					<Questions />
					<Footer />
				</div>
			</main>
			<StickyCta label={ctaLabel} />
		</div>
	);
}
