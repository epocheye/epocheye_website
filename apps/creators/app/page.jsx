"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight, BarChart3, Check, Link2, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import CreatorBrandLink from "@/components/creators/CreatorBrandLink";
import { CREATOR_ROUTES } from "@/lib/creatorRoutes";
import {
	ACCESS_HOURS,
	CUSTOMER_DISCOUNT_PERCENT,
	ASSIGNMENT_DAYS,
	HOLD_DAYS,
	LIST_PRICE_INR,
	MAX_CREATORS,
	MIN_PAYOUT_INR,
	SUPPORT_EMAIL,
	TIERS,
	commissionPerSale,
	discountedPrice,
	earningsForSales,
	formatInr,
	rateForSale,
} from "@/lib/creatorProgram";
import { monumentSentence, useCreatorMonuments } from "@/lib/useCreatorMonuments";

const DITHER_WAVE_COLOR = [0.78, 0.78, 0.78];

const DitherBackground = dynamic(() => import("@/components/Dither"), {
	ssr: false,
});

const MIN_RATE = TIERS[0].rate;
const MAX_RATE = TIERS[TIERS.length - 1].rate;

const KEY_METRICS = [
	{ value: String(MAX_CREATORS), label: "creator spots, by application" },
	{
		value: `${MIN_RATE}-${MAX_RATE}%`,
		label: `of the ${formatInr(LIST_PRICE_INR)} list price on every sale`,
	},
	{ value: `${ASSIGNMENT_DAYS / 7} weeks`, label: "your own monument, no other creator" },
];

const CHANNELS = [
	"Instagram Reels",
	"YouTube Shorts",
	"TikTok",
	"Travel Blogs",
	"Campus Communities",
	"Creator Newsletters",
];

const PROCESS_STEPS = [
	{
		number: "01",
		title: "Apply",
		body: `Sign up and send us your profile. We review every application and take up to ${MAX_CREATORS} creators.`,
	},
	{
		number: "02",
		title: "Get your own monument",
		body: `Approved creators get one monument for ${ASSIGNMENT_DAYS} days, with no other creator on it. Your code works only there, only during your window.`,
	},
	{
		number: "03",
		title: "Share your code, not a link",
		body: "Post your code, or its QR, with your monument content. Visitors enter it in the Epocheye app when they unlock the monument. There are no links to click.",
	},
	{
		number: "04",
		title: "Sell to keep it",
		body: `Reach the sales target in your window and the monument is yours for another ${ASSIGNMENT_DAYS} days. Miss it and it passes to the next creator in line.`,
	},
];

function tierLabel(tier) {
	return tier.to === null ? `Sale ${tier.from}+` : `Sales ${tier.from}-${tier.to}`;
}

// Illustrative dashboard sample. Sales and earnings are computed from the
// program model; clicks are a made-up example figure, and the panel says so.
const SAMPLE_SALES = 40;
const SAMPLE_CLICKS = 1120;
const SAMPLE_METRICS = [
	{ label: "Clicks", value: SAMPLE_CLICKS.toLocaleString("en-IN") },
	{ label: "Sales", value: String(SAMPLE_SALES) },
	{
		label: "Earned",
		value: formatInr(earningsForSales(SAMPLE_SALES), { decimals: 2 }),
	},
	{ label: "Current rate", value: `${rateForSale(SAMPLE_SALES + 1)}%` },
];

const BENEFITS = [
	{
		icon: Link2,
		title: "One code, clean attribution",
		body: "Use a single creator code across channels. Qualified referrals map correctly without spreadsheet cleanup.",
	},
	{
		icon: BarChart3,
		title: "Metrics you can act on",
		body: "See clicks, conversion movement, and payout eligibility in one view so you know what to fix next.",
	},
	{
		icon: Wallet,
		title: "Payouts without back-and-forth",
		body: "Request withdrawals as your balance grows, and keep a clear history of every payout.",
	},
	{
		icon: ShieldCheck,
		title: "Stable by design",
		body: "Creator auth and dashboard permissions stay isolated and production-safe as usage grows.",
	},
];

function buildFaq(monuments) {
	return [
		{
			question: "Can anyone join?",
			answer: `No. The program is invite-only and limited to ${MAX_CREATORS} creators. Sign up, send your profile, and we review it. There is no minimum follower count: we look for creators whose audience visits monuments.`,
		},
		{
			question: "What counts as a click and what counts as a sale?",
			answer: "There are no links. A click is someone entering your code in the Epocheye app, counted once per person per day. A sale is someone paying for a monument unlock in the app with your code. Commission is paid on sales only.",
		},
		{
			question: "How does monument exclusivity work?",
			answer: `Each monument has one creator at a time, for ${ASSIGNMENT_DAYS} days. Your code works only at your monument during your window. Reach the sales target and you keep it for another ${ASSIGNMENT_DAYS} days; otherwise it goes to the next approved creator in line, and you rejoin the line.`,
		},
		{
			question: "Can I promote Epocheye on multiple platforms?",
			answer: "Yes. Share the same code (or its QR) on Instagram, YouTube, TikTok, blogs, newsletters, and community groups. Don't share it as a link: it's entered in the app.",
		},
		{
			question: "What are my followers buying?",
			answer: `A one-time unlock of one monument in the Epocheye app: ${formatInr(LIST_PRICE_INR)} for ${ACCESS_HOURS} hours of access on site. It is not a subscription. Your code takes ${CUSTOMER_DISCOUNT_PERCENT}% off, so they pay ${formatInr(discountedPrice(), { decimals: 2 })}.`,
		},
		{
			question: "Where does it work?",
			answer: `Only at ${monumentSentence(monuments)}. A sale happens when someone unlocks a monument in the app, so your code earns from followers who can visit.`,
		},
		{
			question: "How is commission calculated?",
			answer: `As a percentage of the ${formatInr(LIST_PRICE_INR)} list price, not the discounted price, so the discount never comes out of your earnings. Your rate rises with your total sales: ${TIERS.map((t) => `${tierLabel(t).toLowerCase()} earn ${t.rate}%`).join(", ")}.`,
		},
		{
			question: "When and how do I get paid?",
			answer: `A sale becomes payable ${HOLD_DAYS} days after purchase. Once your payable balance reaches ${formatInr(MIN_PAYOUT_INR)}, request a payout to your UPI ID from the dashboard.`,
		},
		{
			question: "I'm not in India. Can I join?",
			answer: `Not yet. Payouts currently go only to Indian UPI accounts. Email ${SUPPORT_EMAIL} and we'll tell you when international creators can join.`,
		},
		{
			question: "Where do I track performance?",
			answer: "Inside the creators dashboard. You can review clicks, sales, earnings, and payout requests in one place.",
		},
	];
}

const MOTION_EASE = [0.16, 1, 0.3, 1];
const PANEL_CLASS = "rounded-2xl border border-white/10 bg-black/65";
const SECTION_CLASS = "rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md";

const NAV_LINKS = [
	{ href: "#how-it-works", label: "How It Works" },
	{ href: "#payouts", label: "Payouts" },
	{ href: "#faq", label: "FAQ" },
];

export default function CreatorsLandingPage() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const monuments = useCreatorMonuments();
	const faqItems = buildFaq(monuments);

	useEffect(() => {
		if (!mobileNavOpen) return undefined;

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [mobileNavOpen]);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 1024) {
				setMobileNavOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return (
		<main className="relative min-h-screen overflow-x-hidden bg-black font-montserrat text-white">
			<div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
				<DitherBackground
					waveSpeed={0.03}
					waveFrequency={2.4}
					waveAmplitude={0.28}
					waveColor={DITHER_WAVE_COLOR}
					colorNum={4}
					pixelSize={2}
					enableMouseInteraction={false}
				/>
				<div className="absolute inset-0 bg-black/40" />
			</div>

			<div className="relative z-10">
				<nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
					<div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 md:px-8">
						<CreatorBrandLink href="/" size="md" showBadge priority />

						{/* Desktop nav links */}
						<div className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-[0.16em] text-white/45 lg:flex">
							{NAV_LINKS.map(({ href, label }) => (
								<a
									key={href}
									href={href}
									className="hover:text-white/80 transition-colors">
									{label}
								</a>
							))}
						</div>

						{/* Right side: auth + hamburger */}
						<div className="flex shrink-0 items-center gap-2 sm:gap-3">
							<Show when="signed-out">
								<Link
									href={CREATOR_ROUTES.login}
									className="hidden sm:block px-3 py-2 text-sm text-white/60 transition-colors hover:text-white">
									Sign in
								</Link>
								<Link
									href={CREATOR_ROUTES.signup}
									className="hidden sm:inline-flex rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white hover:text-black">
									Apply
								</Link>
								<Link
									href={CREATOR_ROUTES.signup}
									className="inline-flex sm:hidden rounded-full border border-white/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white hover:text-black">
									Apply
								</Link>
							</Show>
							<Show when="signed-in">
								<div className="flex items-center gap-2 sm:gap-3">
									<Link
										href={CREATOR_ROUTES.dashboard}
										className="hidden sm:block rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/85 transition-all duration-300 hover:border-white/45 hover:text-white">
										Dashboard
									</Link>
									<UserButton afterSignOutUrl={CREATOR_ROUTES.home} />
								</div>
							</Show>

							{/* Hamburger — mobile only */}
							<button
								onClick={() => setMobileNavOpen((o) => !o)}
								type="button"
								className="lg:hidden p-2 text-white/50 hover:text-white transition-colors"
								aria-label="Toggle navigation"
								aria-expanded={mobileNavOpen}>
								{mobileNavOpen ? (
									<X className="w-5 h-5" />
								) : (
									<Menu className="w-5 h-5" />
								)}
							</button>
						</div>
					</div>

					{/* Mobile dropdown */}
					<AnimatePresence>
						{mobileNavOpen && (
							<motion.div
								key="mobile-nav"
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
								className="overflow-hidden border-t border-white/10 bg-black/90 backdrop-blur-xl lg:hidden">
								<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 space-y-1">
									{NAV_LINKS.map(({ href, label }) => (
										<a
											key={href}
											href={href}
											onClick={() => setMobileNavOpen(false)}
											className="flex items-center px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5">
											{label}
										</a>
									))}
									<Show when="signed-out">
										<div className="pt-2 border-t border-white/10 mt-2">
											<Link
												href={CREATOR_ROUTES.signup}
												onClick={() => setMobileNavOpen(false)}
												className="flex items-center px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5">
												Apply
											</Link>
											<Link
												href={CREATOR_ROUTES.login}
												onClick={() => setMobileNavOpen(false)}
												className="flex items-center px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5">
												Sign in
											</Link>
										</div>
									</Show>
									<Show when="signed-in">
										<div className="pt-2 border-t border-white/10 mt-2">
											<Link
												href={CREATOR_ROUTES.dashboard}
												onClick={() => setMobileNavOpen(false)}
												className="flex items-center px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5">
												Dashboard
											</Link>
										</div>
									</Show>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</nav>

				<section className="px-4 pb-8 pt-24 sm:px-6 md:px-8 md:pt-28">
					<motion.div
						initial={{ opacity: 0, y: 28 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.9, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-7xl p-5 md:p-6`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
							Creator Partner Program
						</p>
						<h1 className="my-5 text-2xl leading-8 tracking-tight sm:text-3xl md:text-4xl lg:text-5xl flex flex-col justify-center items-start">
							<span className="font-extralight text-white/92">
								Your audience already visits monuments.
							</span>
							<br />
							<span className="font-semibold text-white">
								Get paid when they choose Epocheye.
							</span>
						</h1>
						<p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/62 md:text-base">
							History and travel creators already have the right audience.
							Share one code when people plan a monument visit, then track paid
							sales and payouts from one focused dashboard.
						</p>

						<div className="mt-6 max-w-3xl rounded-2xl border border-white/15 bg-black/60 p-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
								Live at these monuments only
							</p>
							<ul className="mt-3 flex flex-wrap gap-2">
								{monuments.map((m) => (
									<li
										key={m.name}
										className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/85">
										{m.name}
										{m.place ? (
										<span className="text-white/45"> · {m.place}</span>
									) : null}
									</li>
								))}
							</ul>
							<p className="mt-3 text-xs leading-relaxed text-white/50">
								A sale happens when a visitor unlocks{" "}
								{monuments.length === 1 ? "this monument" : "one of these monuments"} in
								the app. Followers who can&apos;t visit can&apos;t buy yet.
							</p>
						</div>

						<div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
							<Link
								href={CREATOR_ROUTES.signup}
								className="group inline-flex items-center gap-3 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white hover:text-black">
								Apply for a spot
								<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
							</Link>
							<Link
								href={CREATOR_ROUTES.login}
								className="text-sm text-white/45 transition-colors hover:text-white/80">
								Already in? Open dashboard
							</Link>
						</div>

						<div className="mt-7 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
							<div className="grid gap-px bg-white/10 md:grid-cols-3">
								{KEY_METRICS.map((metric) => (
									<div
										key={metric.label}
										className="bg-black/70 px-5 py-5 md:px-6">
										<p className="text-2xl font-semibold text-white md:text-3xl">
											{metric.value}
										</p>
										<p className="mt-1 text-xs uppercase tracking-[0.14em] text-white/38">
											{metric.label}
										</p>
									</div>
								))}
							</div>
						</div>
					</motion.div>
				</section>

				<section className="px-4 pb-10 sm:px-6 md:px-8">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-80px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-7xl p-5 md:p-6`}>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
							Channels creators already own
						</p>
						<div className="mt-5 flex flex-wrap gap-2.5">
							{CHANNELS.map((channel) => (
								<span
									key={channel}
									className="rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs font-medium uppercase tracking-widest text-white/70">
									{channel}
								</span>
							))}
						</div>
					</motion.div>
				</section>

				<section
					id="how-it-works"
					className="border-t border-white/10 px-4 py-12 sm:px-6 md:px-8">
					<div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[0.9fr_1.1fr]">
						<motion.div
							initial={{ opacity: 0, y: 26 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-90px" }}
							transition={{ duration: 0.8, ease: MOTION_EASE }}
							className={`${SECTION_CLASS} p-5 md:p-6`}>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
								How It Works
							</p>
							<h2 className="mt-4 text-3xl font-light leading-tight md:text-4xl">
								From post to payout
								<br />
								<span className="font-bold text-white">
									in four clear steps.
								</span>
							</h2>
							<p className="mt-5 max-w-md text-sm text-white/58 md:text-base">
								Most affiliate programs break when tracking gets messy. This
								one keeps it tight: one code, one dashboard, no manual
								reconciliation.
							</p>
						</motion.div>

						<div className="space-y-2.5">
							{PROCESS_STEPS.map((step, index) => (
								<motion.div
									key={step.number}
									initial={{ opacity: 0, y: 24 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, margin: "-80px" }}
									transition={{
										duration: 0.65,
										delay: index * 0.08,
										ease: MOTION_EASE,
									}}
									className={`${PANEL_CLASS} p-4 md:p-5`}>
									<div className="flex items-start gap-4">
										<span className="pt-1 text-2xl font-bold leading-none text-white/18 md:text-3xl">
											{step.number}
										</span>
										<div>
											<h3 className="text-base font-semibold text-white md:text-lg">
												{step.title}
											</h3>
											<p className="mt-2 text-sm leading-relaxed text-white/56">
												{step.body}
											</p>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</div>
				</section>

				<section
					id="payouts"
					className="border-t border-white/10 px-4 py-12 sm:px-6 md:px-8">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-7xl p-5 md:p-6`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
							Payout Model
						</p>
						<h2 className="mt-4 text-3xl font-light leading-tight md:text-4xl">
							One price. One rate card.
							<br />
							<span className="font-bold text-white">
								Earnings you can work out.
							</span>
						</h2>
						<p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/56 md:text-base">
							One monument unlock is {formatInr(LIST_PRICE_INR)}. Your commission
							is a percentage of that list price, whatever discount your code
							gives, and your rate rises as your total sales grow.
						</p>

						<div className="mt-6 grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-3 xl:grid-cols-5">
							{TIERS.map((tier, index) => (
								<motion.div
									key={tier.from}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, margin: "-60px" }}
									transition={{
										duration: 0.6,
										delay: index * 0.06,
										ease: MOTION_EASE,
									}}
									className={`${PANEL_CLASS} p-4 md:p-5`}>
									<p className="text-2xl font-bold text-white md:text-3xl">
										{tier.rate}%
									</p>
									<p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
										{tierLabel(tier)}
									</p>
									<p className="mt-4 text-base font-semibold text-white/88 md:text-lg">
										{formatInr(commissionPerSale(tier.rate), { decimals: 2 })}
									</p>
									<p className="text-xs text-white/35">per sale</p>
									<p className="mt-3 text-sm text-white/70">
										{formatInr(commissionPerSale(tier.rate) * 100, { decimals: 0 })}
										<span className="text-white/35"> per 100 sales</span>
									</p>
									<p className="text-sm text-white/70">
										{formatInr(commissionPerSale(tier.rate) * 1000, { decimals: 0 })}
										<span className="text-white/35"> per 1,000 sales</span>
									</p>
								</motion.div>
							))}
						</div>
						<p className="mt-4 text-xs leading-relaxed text-white/40">
							The per-100 and per-1,000 figures apply one tier&apos;s rate to every
							sale. Your real total mixes tiers as you move up. Sales are held{" "}
							{HOLD_DAYS} days before they are payable, and refunded sales are
							reversed. See the{" "}
							<Link href="/terms" className="underline hover:text-white/70">
								creator terms
							</Link>
							.
						</p>
					</motion.div>
				</section>

				<section className="border-t border-white/10 px-4 py-12 sm:px-6 md:px-8">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-7xl p-5 md:p-6`}>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
							What You Get
						</p>
						<h2 className="mt-4 text-3xl font-light leading-tight md:text-4xl">
							The operating stack for
							<br />
							<span className="font-bold">repeatable creator revenue.</span>
						</h2>

						<div className="mt-8 grid gap-4 md:grid-cols-2">
							{BENEFITS.map(({ icon: Icon, title, body }, index) => (
								<motion.div
									key={title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, margin: "-70px" }}
									transition={{
										duration: 0.6,
										delay: index * 0.08,
										ease: MOTION_EASE,
									}}
									className={`${PANEL_CLASS} p-5`}>
									<div className="flex items-start gap-4">
										<div className="rounded-full border border-white/20 p-2 text-white/80">
											<Icon className="h-4 w-4" />
										</div>
										<div>
											<h3 className="text-base font-semibold text-white md:text-lg">
												{title}
											</h3>
											<p className="mt-2 text-sm leading-relaxed text-white/55">
												{body}
											</p>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				</section>

				<section className="border-t border-white/10 px-4 py-12 sm:px-6 md:px-8">
					<div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[0.92fr_1.08fr]">
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-80px" }}
							transition={{ duration: 0.8, ease: MOTION_EASE }}
							className={`${SECTION_CLASS} p-5 md:p-6`}>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
								Dashboard Preview
							</p>
							<h2 className="mt-4 text-3xl font-light leading-tight md:text-4xl">
								See your growth loop
								<br />
								<span className="font-bold">week by week.</span>
							</h2>
							<p className="mt-6 text-sm leading-relaxed text-white/58 md:text-base">
								Every creator gets referral-level visibility into clicks,
								sales, commission, and payout status.
							</p>
							<div className="mt-6 rounded-2xl border border-white/10 bg-black/65 p-4">
								<div className="flex items-start gap-3">
									<Check className="mt-0.5 h-4 w-4 text-white/70" />
									<p className="text-sm text-white/62">
										The preview is an illustrative example, not real creator
										data. Its earnings are {SAMPLE_SALES} sales on the rate card
										above: the first {TIERS[0].to} at {TIERS[0].rate}% and the
										next {SAMPLE_SALES - TIERS[0].to} at {TIERS[1].rate}%.
									</p>
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-80px" }}
							transition={{ duration: 0.9, ease: MOTION_EASE }}
							className={`${PANEL_CLASS} overflow-hidden`}>
							<div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
								<p className="text-xs uppercase tracking-[0.14em] text-white/40">
									Illustrative example · not real data
								</p>
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-white/20" />
									<div className="h-2 w-2 rounded-full bg-white/20" />
									<div className="h-2 w-2 rounded-full bg-white/20" />
								</div>
							</div>

							<div className="grid grid-cols-2 gap-px bg-white/10 p-px">
								{SAMPLE_METRICS.map((item) => (
									<div
										key={item.label}
										className="bg-black/78 px-4 py-5">
										<p className="text-[11px] uppercase tracking-[0.13em] text-white/35">
											{item.label}
										</p>
										<p className="mt-2 text-xl font-semibold text-white md:text-2xl">
											{item.value}
										</p>
									</div>
								))}
							</div>

							<div className="border-t border-white/10 px-5 py-5">
								<p className="text-[11px] uppercase tracking-[0.13em] text-white/35">
									Your promo code (sample)
								</p>
								<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
									<p className="font-mono text-xl font-bold tracking-[0.18em] text-white md:text-2xl">
										SAMPLE123
									</p>
								</div>
							</div>
						</motion.div>
					</div>
				</section>

				<section
					id="faq"
					className="border-t border-white/10 px-4 py-12 sm:px-6 md:px-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-5xl p-5 md:p-6`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
							FAQ
						</p>
						<h2 className="mt-4 text-3xl font-light md:text-4xl">
							Questions before you join?
						</h2>
						<div className="mt-5 space-y-2.5">
							{faqItems.map((item) => (
								<details
									key={item.question}
									className={`${PANEL_CLASS} group p-3 md:p-4`}>
									<summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.08em] text-white/85">
										{item.question}
									</summary>
									<p className="mt-3 text-sm leading-relaxed text-white/56">
										{item.answer}
									</p>
								</details>
							))}
						</div>
					</motion.div>
				</section>

				<section className="border-t border-white/10 px-4 py-14 text-center sm:px-6 md:px-8">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.85, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-4xl p-5 md:p-6`}>
						<h2 className="text-3xl font-light leading-tight md:text-5xl">
							Your audience already cares.
							<br />
							<span className="font-bold">Now give them a code.</span>
						</h2>
						<p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/54 md:text-base">
							{MAX_CREATORS} spots. One monument each, {ASSIGNMENT_DAYS} days at a time. Apply
							and we&apos;ll get back to you.
						</p>
						<Link
							href={CREATOR_ROUTES.signup}
							className="group mt-8 inline-flex items-center gap-3 rounded-full border border-white/30 px-8 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white hover:text-black">
							Apply to the program
							<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
						</Link>
					</motion.div>
				</section>

				<footer className="border-t border-white/10 bg-black/55 px-4 py-6 backdrop-blur-md sm:px-6 md:px-8">
					<div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
						<div className="flex items-center gap-3">
							<CreatorBrandLink href="/" size="sm" showBadge={false} />
							<Link
								href="/"
								className="text-sm text-white/40 transition-colors hover:text-white/70">
								Back to Epocheye
							</Link>
						</div>
						<p className="text-xs text-white/25">
							© {new Date().getFullYear()} Epocheye. All rights reserved.
						</p>
						<div className="flex items-center gap-6 text-xs uppercase tracking-widest text-white/35">
							<Link href="/terms" className="hover:text-white/70 transition-colors">
								Creator Terms
							</Link>
							<Link
								href={CREATOR_ROUTES.login}
								className="hover:text-white/70 transition-colors">
								Creator Login
							</Link>
							<Link
								href={CREATOR_ROUTES.signup}
								className="hover:text-white/70 transition-colors">
								Sign Up
							</Link>
						</div>
					</div>
				</footer>
			</div>
		</main>
	);
}
