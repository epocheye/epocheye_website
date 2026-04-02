"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, Link2, ShieldCheck, Wallet } from "lucide-react";
import CreatorBrandLink from "@/components/creators/CreatorBrandLink";

const DITHER_WAVE_COLOR = [0.78, 0.78, 0.78];

const DitherBackground = dynamic(() => import("@/components/Dither"), {
	ssr: false,
});

const KEY_METRICS = [
	{ value: "3 min", label: "to launch your creator code" },
	{ value: "5-20%", label: "commission on each paid referral" },
	{ value: "Live", label: "tracking for clicks, conversions, earnings" },
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
		title: "Create your creator account",
		body: "Sign up, set your profile, and activate your dashboard in one short flow.",
	},
	{
		number: "02",
		title: "Get your unique promo code",
		body: "Your code is tied to your account so every qualifying referral is automatically tracked.",
	},
	{
		number: "03",
		title: "Publish content where you already grow",
		body: "Post tutorials, travel explainers, reels, shorts, or reviews. We do not lock you to one format.",
	},
	{
		number: "04",
		title: "Monitor and request payouts",
		body: "View performance in real time and request payouts directly from the creator dashboard.",
	},
];

const EARNING_SCENARIOS = [
	{ signups: "25", low: "$0.75", high: "$3.00" },
	{ signups: "100", low: "$3.00", high: "$12.00" },
	{ signups: "500", low: "$15.00", high: "$60.00" },
	{ signups: "1,000", low: "$30.00", high: "$120.00" },
];

const BENEFITS = [
	{
		icon: Link2,
		title: "Code-level attribution",
		body: "One creator code. Accurate referral mapping. No spreadsheet tracking.",
	},
	{
		icon: BarChart3,
		title: "Signal-rich analytics",
		body: "Track clicks, conversion trends, and payout eligibility in one view.",
	},
	{
		icon: Wallet,
		title: "Fast payout flow",
		body: "Request withdrawals as your balance grows, with a clear history trail.",
	},
	{
		icon: ShieldCheck,
		title: "Built for consistency",
		body: "Creator auth and dashboard permissions are isolated and production-safe.",
	},
];

const FAQ_ITEMS = [
	{
		question: "Do I need a minimum follower count?",
		answer: "No. The program rewards conversions, not vanity metrics. If your audience converts, you earn.",
	},
	{
		question: "Can I promote Epocheye on multiple platforms?",
		answer: "Yes. Your code works across any channel, including social platforms, articles, and community groups.",
	},
	{
		question: "How is commission calculated?",
		answer: "Commission is a percentage of paid subscriptions driven through your creator code. Tiers range from 5% to 20%.",
	},
	{
		question: "Where do I track performance?",
		answer: "Inside the creators dashboard, where you can review clicks, conversions, earnings, and payout requests.",
	},
];

const MOTION_EASE = [0.16, 1, 0.3, 1];
const PANEL_CLASS = "rounded-2xl border border-white/10 bg-black/65";
const SECTION_CLASS = "rounded-3xl border border-white/10 bg-black/45 backdrop-blur-md";

export default function CreatorsLandingPage() {
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
				<nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/75 px-6 py-5 backdrop-blur-xl md:px-12">
					<div className="mx-auto flex w-full max-w-6xl items-center justify-between">
						<CreatorBrandLink href="/" size="md" showBadge priority />
						<div className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-[0.16em] text-white/45 lg:flex">
							<a
								href="#how-it-works"
								className="hover:text-white/80 transition-colors">
								How It Works
							</a>
							<a
								href="#payouts"
								className="hover:text-white/80 transition-colors">
								Payouts
							</a>
							<a href="#faq" className="hover:text-white/80 transition-colors">
								FAQ
							</a>
						</div>
						<div className="flex items-center gap-3">
							<Link
								href="/creators/login"
								className="px-3 py-2 text-sm text-white/60 transition-colors hover:text-white">
								Sign in
							</Link>
							<Link
								href="/creators/signup"
								className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white hover:text-black">
								Join Program
							</Link>
						</div>
					</div>
				</nav>

				<section className="px-6 pb-16 pt-36 md:px-12 md:pt-40">
					<motion.div
						initial={{ opacity: 0, y: 28 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.9, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-6xl p-8 md:p-12`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
							Creator Partner Program
						</p>
						<h1 className="mt-6 text-5xl leading-[1.04] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
							<span className="font-light text-white/92">
								Turn influence into
							</span>
							<br />
							<span className="font-bold text-white">
								recurring monthly income.
							</span>
						</h1>
						<p className="mt-8 max-w-2xl text-base leading-relaxed text-white/62 md:text-lg">
							Built for creators who care about outcomes. Share Epocheye with
							your audience, track every conversion, and scale earnings from
							one focused dashboard.
						</p>

						<div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
							<Link
								href="/creators/signup"
								className="group inline-flex items-center gap-3 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:bg-white hover:text-black">
								Start Earning
								<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
							</Link>
							<Link
								href="/creators/login"
								className="text-sm text-white/45 transition-colors hover:text-white/80">
								Already in the program? Open dashboard
							</Link>
						</div>

						<div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
							<div className="grid gap-px bg-white/10 md:grid-cols-3">
								{KEY_METRICS.map((metric) => (
									<div
										key={metric.label}
										className="bg-black/70 px-6 py-6 md:px-7">
										<p className="text-3xl font-semibold text-white">
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

				<section className="px-6 pb-20 md:px-12">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-80px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-6xl p-8 md:p-10`}>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
							Where creators distribute
						</p>
						<div className="mt-6 flex flex-wrap gap-3">
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
					className="border-t border-white/10 px-6 py-24 md:px-12">
					<div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
						<motion.div
							initial={{ opacity: 0, y: 26 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-90px" }}
							transition={{ duration: 0.8, ease: MOTION_EASE }}
							className={`${SECTION_CLASS} p-8 md:p-10`}>
							<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
								How It Works
							</p>
							<h2 className="mt-4 text-4xl font-light leading-tight md:text-5xl">
								A direct path from
								<br />
								<span className="font-bold text-white">
									content to commission.
								</span>
							</h2>
							<p className="mt-6 max-w-md text-white/58">
								No complex setup, no custom links per platform, no manual
								payout tracking. The system is designed to keep your growth
								loop simple.
							</p>
						</motion.div>

						<div className="space-y-4">
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
									className={`${PANEL_CLASS} p-6 md:p-7`}>
									<div className="flex items-start gap-4">
										<span className="pt-1 text-3xl font-bold leading-none text-white/18">
											{step.number}
										</span>
										<div>
											<h3 className="text-lg font-semibold text-white">
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

				<section id="payouts" className="border-t border-white/10 px-6 py-24 md:px-12">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-6xl p-8 md:p-10`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
							Payout Model
						</p>
						<h2 className="mt-4 text-4xl font-light leading-tight md:text-5xl">
							Predictable upside with
							<br />
							<span className="font-bold text-white">
								clear conversion math.
							</span>
						</h2>
						<p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/56 md:text-base">
							Epocheye subscriptions are priced between $2 and $4 per month.
							Your commission tier determines payout per conversion. As your
							volume grows, payout tiers can scale too.
						</p>

						<div className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4">
							{EARNING_SCENARIOS.map((scenario, index) => (
								<motion.div
									key={scenario.signups}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true, margin: "-60px" }}
									transition={{
										duration: 0.6,
										delay: index * 0.06,
										ease: MOTION_EASE,
									}}
									className={`${PANEL_CLASS} p-6`}>
									<p className="text-3xl font-bold text-white">
										{scenario.signups}
									</p>
									<p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/35">
										monthly signups
									</p>
									<p className="mt-4 text-lg font-semibold text-white/88">
										{scenario.low} - {scenario.high}
									</p>
									<p className="text-xs text-white/35">
										estimated payout range
									</p>
								</motion.div>
							))}
						</div>
					</motion.div>
				</section>

				<section className="border-t border-white/10 px-6 py-24 md:px-12">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-6xl p-8 md:p-10`}>
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
							What You Get
						</p>
						<h2 className="mt-4 text-4xl font-light leading-tight md:text-5xl">
							Everything needed to run
							<br />
							<span className="font-bold">
								a high-discipline creator funnel.
							</span>
						</h2>

						<div className="mt-10 grid gap-4 md:grid-cols-2">
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
									className={`${PANEL_CLASS} p-6`}>
									<div className="flex items-start gap-4">
										<div className="rounded-full border border-white/20 p-2 text-white/80">
											<Icon className="h-4 w-4" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-white">
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

				<section className="border-t border-white/10 px-6 py-24 md:px-12">
					<div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-80px" }}
							transition={{ duration: 0.8, ease: MOTION_EASE }}
							className={`${SECTION_CLASS} p-8 md:p-10`}>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">
								Dashboard Preview
							</p>
							<h2 className="mt-4 text-4xl font-light leading-tight md:text-5xl">
								See your growth loop
								<br />
								<span className="font-bold">without guesswork.</span>
							</h2>
							<p className="mt-6 text-sm leading-relaxed text-white/58 md:text-base">
								Every creator gets referral-level visibility: clicks,
								conversions, estimated commission, and payout status.
							</p>
							<div className="mt-8 rounded-2xl border border-white/10 bg-black/65 p-5">
								<div className="flex items-start gap-3">
									<Check className="mt-0.5 h-4 w-4 text-white/70" />
									<p className="text-sm text-white/62">
										Creators who review this dashboard weekly usually
										improve conversion quality faster than creators
										tracking only top-line reach.
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
							<div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
								<p className="text-xs uppercase tracking-[0.14em] text-white/40">
									epocheye.app/creators/dashboard
								</p>
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-white/20" />
									<div className="h-2 w-2 rounded-full bg-white/20" />
									<div className="h-2 w-2 rounded-full bg-white/20" />
								</div>
							</div>

							<div className="grid grid-cols-2 gap-px bg-white/10 p-px">
								{[
									{ label: "Total Clicks", value: "3,428" },
									{ label: "Conversions", value: "272" },
									{ label: "Est. Earnings", value: "$82.50" },
									{ label: "Available", value: "$26.40" },
								].map((item) => (
									<div
										key={item.label}
										className="bg-black/78 px-5 py-6">
										<p className="text-[11px] uppercase tracking-[0.13em] text-white/35">
											{item.label}
										</p>
										<p className="mt-2 text-2xl font-semibold text-white">
											{item.value}
										</p>
									</div>
								))}
							</div>

							<div className="border-t border-white/10 px-6 py-6">
								<p className="text-[11px] uppercase tracking-[0.13em] text-white/35">
									Your promo code
								</p>
								<div className="mt-2 flex flex-wrap items-center justify-between gap-4">
									<p className="font-mono text-2xl font-bold tracking-[0.18em] text-white">
										EPCH7412
									</p>
									<button
										type="button"
										className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/68 transition-colors hover:text-white">
										Copy code
									</button>
								</div>
							</div>
						</motion.div>
					</div>
				</section>

				<section id="faq" className="border-t border-white/10 px-6 py-24 md:px-12">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.8, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-4xl p-8 md:p-10`}>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
							FAQ
						</p>
						<h2 className="mt-4 text-4xl font-light md:text-5xl">
							Questions before you start?
						</h2>
						<div className="mt-8 space-y-3">
							{FAQ_ITEMS.map((item) => (
								<details
									key={item.question}
									className={`${PANEL_CLASS} group p-5`}>
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

				<section className="border-t border-white/10 px-6 py-28 text-center md:px-12">
					<motion.div
						initial={{ opacity: 0, y: 22 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-90px" }}
						transition={{ duration: 0.85, ease: MOTION_EASE }}
						className={`${SECTION_CLASS} mx-auto max-w-3xl p-8 md:p-10`}>
						<h2 className="text-4xl font-light leading-tight md:text-6xl">
							Ready to convert reach
							<br />
							<span className="font-bold">into monthly payouts?</span>
						</h2>
						<p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/54 md:text-base">
							Join the program in minutes. Get your code, launch your first
							campaign, and track outcomes from day one.
						</p>
						<Link
							href="/creators/signup"
							className="group mt-10 inline-flex items-center gap-3 rounded-full border border-white/30 px-8 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-white hover:text-black">
							Join Creator Program
							<ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
						</Link>
					</motion.div>
				</section>

				<footer className="border-t border-white/10 bg-black/55 px-6 py-10 backdrop-blur-md md:px-12">
					<div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
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
							<Link
								href="/creators/login"
								className="hover:text-white/70 transition-colors">
								Creator Login
							</Link>
							<Link
								href="/creators/signup"
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
