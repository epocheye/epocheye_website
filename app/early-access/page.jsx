"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import Navbar from "@/components/sections/Navbar";
import ShinyText from "@/components/ShinyText";

// WebGL background — client only (matches the DarkBeamsBackground pattern).
const LineWaves = dynamic(() => import("@/components/early-access/LineWaves"), {
	ssr: false,
	loading: () => <div className="absolute inset-0 bg-black" />,
});

const EASE = [0.22, 1, 0.36, 1];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AppleGlyph() {
	return (
		<svg viewBox="0 0 384 512" className="h-5 w-5" fill="currentColor" aria-hidden="true">
			<path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C73.6 141.6 24 184.5 24 271.9c0 25.8 4.7 52.5 14.1 80.1 12.6 36.4 58 125.9 105.4 124.4 24.8-.6 42.3-17.6 74.6-17.6 31.3 0 47.5 17.6 76.4 17.6 47.8-.7 88.9-82.1 100.9-118.6-64.1-30.2-60.7-88.5-60.7-89.5zM262.1 104.5c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
		</svg>
	);
}

function PlayGlyph() {
	return (
		<svg viewBox="0 0 512 512" className="h-5 w-5" fill="currentColor" aria-hidden="true">
			<path d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l220.7-221.3 60.1 60.1L104.6 499z" />
		</svg>
	);
}

function StorePill({ glyph, store }) {
	return (
		<div
			aria-disabled="true"
			className="flex cursor-default items-center gap-3 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-left backdrop-blur-sm">
			<span className="text-white/85">{glyph}</span>
			<span className="leading-tight">
				<span className="block text-[9px] font-medium uppercase tracking-[0.18em] text-white/40">
					Coming soon to
				</span>
				<span className="block text-sm font-semibold text-white">{store}</span>
			</span>
		</div>
	);
}

function StoreBadges() {
	return (
		<div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
			<StorePill glyph={<AppleGlyph />} store="App Store" />
			<StorePill glyph={<PlayGlyph />} store="Google Play" />
		</div>
	);
}

export default function EarlyAccessPage() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState("idle"); // idle | submitting | success | error
	const [errorMsg, setErrorMsg] = useState("");

	// After a successful signup, hold the thank-you screen ~2.5s then revert.
	useEffect(() => {
		if (status !== "success") return;
		const t = setTimeout(() => {
			setStatus("idle");
			setEmail("");
		}, 2500);
		return () => clearTimeout(t);
	}, [status]);

	async function handleSubmit(e) {
		e.preventDefault();
		const value = email.trim().toLowerCase();
		if (!EMAIL_RE.test(value)) {
			setStatus("error");
			setErrorMsg("Please enter a valid email address.");
			return;
		}
		setStatus("submitting");
		setErrorMsg("");
		try {
			const res = await fetch("/api/early-access", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: value }),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.success) {
				setStatus("success");
			} else {
				setStatus("error");
				setErrorMsg(data.error || "Something went wrong. Please try again.");
			}
		} catch {
			setStatus("error");
			setErrorMsg("Network error. Please try again.");
		}
	}

	return (
		<main className="relative min-h-screen overflow-hidden bg-black font-montserrat">
			{/* LineWaves background */}
			<div className="fixed inset-0 z-0 bg-black">
				<LineWaves
					speed={0.3}
					innerLineCount={32}
					outerLineCount={36}
					warpIntensity={1.0}
					rotation={-45}
					edgeFadeWidth={0.0}
					colorCycleSpeed={1.0}
					brightness={0.1}
					color1="#ffffff"
					color2="#ffffff"
					color3="#ffffff"
					enableMouseInteraction={true}
					mouseInfluence={2.0}
				/>
				{/* Subtle vignette to seat the type */}
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
			</div>

			{/* Nav */}
			<div className="fixed top-0 left-0 z-50 w-full">
				<Navbar showLogo={true} />
			</div>

			{/* Content */}
			<section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center sm:px-6">
				<motion.h1
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.2, ease: EASE }}
					className="max-w-3xl text-3xl font-light leading-[1.15] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
					Be the first to
					<br />
					<span className="font-semibold">experience heritage.</span>
				</motion.h1>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.6 }}
					transition={{ duration: 1, delay: 0.5, ease: EASE }}
					className="mt-6 max-w-xl text-base font-medium text-white sm:mt-8 sm:text-lg md:text-xl">
					Historical intelligence for the physical world. Leave your email for early
					access.
				</motion.p>

				<motion.form
					onSubmit={handleSubmit}
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.8, ease: EASE }}
					className="mt-8 w-full max-w-md sm:mt-12"
					noValidate>
					<div className="flex items-center gap-2 rounded-full border border-white/30 bg-white/5 py-2 pl-5 pr-2 backdrop-blur-sm transition-colors focus-within:border-white/60">
						<input
							type="email"
							inputMode="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@email.com"
							disabled={status === "submitting"}
							aria-label="Email address"
							className="min-w-0 flex-1 bg-transparent font-montserrat text-sm text-white outline-none placeholder:text-white/40 sm:text-base"
						/>
						<button
							type="submit"
							disabled={status === "submitting"}
							className="group flex shrink-0 items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-all duration-500 hover:bg-white hover:text-black disabled:opacity-50 sm:px-5 sm:py-2.5 sm:text-sm">
							{status === "submitting" ? "Joining" : "Join"}
							<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
						</button>
					</div>

					<AnimatePresence>
						{status === "error" && errorMsg && (
							<motion.p
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="mt-3 text-sm text-red-300/80">
								{errorMsg}
							</motion.p>
						)}
					</AnimatePresence>
				</motion.form>

				{/* Launching-soon note */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.5 }}
					transition={{ duration: 1, delay: 1.1, ease: EASE }}
					className="mt-6 text-[11px] font-medium uppercase tracking-[0.22em] text-white/90 sm:text-xs">
					Launching soon on Google Play &amp; the App Store
				</motion.p>

				{/* Scroll cue */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.4 }}
					transition={{ duration: 1, delay: 1.6, ease: EASE }}
					className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/40">
					<span className="text-[10px] uppercase tracking-[0.3em]">Mission</span>
					<ArrowDown className="h-4 w-4 animate-bounce" />
				</motion.div>
			</section>

			{/* Mission */}
			<section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center sm:px-10">
				{/* Scrim to seat the copy over the moving waves */}
				<div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_58%_50%_at_center,rgba(0,0,0,0.78),transparent_78%)]" />
				<motion.div
					initial={{ opacity: 0, y: 32 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-15% 0px" }}
					transition={{ duration: 1, ease: EASE }}
					className="max-w-4xl">
					<span className="font-instrument-sans text-xs font-semibold uppercase tracking-[0.3em] text-accent sm:text-sm">
						{"// The Mission"}
					</span>
					<h2 className="mt-4 font-instrument-serif text-3xl font-light leading-[1.1] text-white sm:text-4xl lg:text-5xl">
						History you can <span className="font-bold">step inside.</span>
					</h2>
					<p className="mt-7 text-base leading-relaxed text-white/65 sm:text-lg">
						Heritage is fading faster than we can witness it. The world&apos;s
						monuments stand weathered and incomplete — their stories flattened
						into plaques and guesswork, a fraction of the wonder they once were.
					</p>
					<p className="mt-5 text-base leading-relaxed text-white/65 sm:text-lg">
						Epocheye is historical intelligence for the physical world. Point your
						phone at a monument and watch it rise again in augmented reality —
						rebuilt in its original glory, with an AI historian narrating exactly
						where you stand. Our mission is to make heritage something you{" "}
						<span className="text-white">experience</span>, not just read about:
						bridging centuries of history with technology so the world&apos;s
						monuments can be seen, understood, and felt by everyone, everywhere.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-10% 0px" }}
					transition={{ duration: 1, delay: 0.15, ease: EASE }}
					className="mt-14 flex flex-col items-center gap-5">
					<span className="font-instrument-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-white/45">
						Epocheye is launching soon
					</span>
					<StoreBadges />
				</motion.div>
			</section>

			{/* Thank-you screen */}
			<AnimatePresence>
				{status === "success" && (
					<motion.div
						key="thanks"
						className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-black/85 px-6 text-center backdrop-blur-sm font-montserrat"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.6, ease: EASE }}>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.1, ease: EASE }}>
							<ShinyText
								text="Epocheye"
								disabled={false}
								speed={2}
								className="text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl font-montserrat"
							/>
						</motion.div>
						<motion.h2
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
							className="mt-6 max-w-2xl text-2xl font-light leading-[1.2] tracking-tight text-white sm:text-3xl md:text-4xl">
							Thank you for registering
							<br />
							<span className="font-semibold">for early access.</span>
						</motion.h2>
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.6 }}
							transition={{ duration: 0.9, delay: 0.6, ease: EASE }}
							className="mt-5 text-sm font-medium text-white sm:text-base">
							We&apos;ll be in touch when it&apos;s time.
						</motion.p>
					</motion.div>
				)}
			</AnimatePresence>
		</main>
	);
}
