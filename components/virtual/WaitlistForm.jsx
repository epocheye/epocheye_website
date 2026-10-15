"use client";

import { useState } from "react";
import Link from "next/link";
import { trackVirtual, utmParams } from "./track";

// Glass pill with the white action inside it, as in the main site's HeroOffer.
export default function WaitlistForm({ buttonLabel, note, consentLabel, successMessage }) {
	const [status, setStatus] = useState("idle"); // idle | submitting | success | error
	const [error, setError] = useState("");

	async function onSubmit(e) {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		setStatus("submitting");
		setError("");

		try {
			const res = await fetch("/api/virtual/waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: String(data.get("email") || ""),
					consent: data.get("consent") === "on",
					website: String(data.get("website") || ""),
					...utmParams(),
					referrer: document.referrer || "",
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok || !json.success) {
				throw new Error(json.error || "Something went wrong. Please try again.");
			}
			trackVirtual("virtual_email_submit");
			setStatus("success");
		} catch (err) {
			setError(err.message);
			setStatus("error");
		}
	}

	if (status === "success") {
		return (
			<p
				role="status"
				className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 font-montserrat text-sm font-semibold text-white backdrop-blur-sm sm:text-base">
				{successMessage}
			</p>
		);
	}

	return (
		<form onSubmit={onSubmit} className="relative flex w-full max-w-md flex-col items-center">
			<div className="flex w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1 pl-5 pr-1 backdrop-blur-sm focus-within:border-white/50">
				<label htmlFor="virtual-email" className="sr-only">
					Email address
				</label>
				<input
					id="virtual-email"
					name="email"
					type="email"
					required
					autoComplete="email"
					maxLength={254}
					placeholder="Your email"
					className="min-w-0 flex-1 bg-transparent py-2 font-montserrat text-sm text-white placeholder:text-white/50 focus:outline-none sm:text-base"
				/>
				<button
					type="submit"
					disabled={status === "submitting"}
					className="shrink-0 rounded-full bg-white px-4 py-2.5 font-montserrat text-[11px] font-semibold uppercase tracking-[0.12em] text-black transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-60 sm:px-5 sm:text-xs">
					{buttonLabel}
				</button>
			</div>

			<p className="mt-3 font-montserrat text-xs font-medium text-white/60 sm:text-sm">
				{note}
			</p>

			{/* Honeypot: off-screen and skipped by keyboard and assistive tech. */}
			<div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
				<label>
					Website
					<input type="text" name="website" tabIndex={-1} autoComplete="off" />
				</label>
			</div>

			<label className="mt-4 flex max-w-sm cursor-pointer items-start gap-2.5 text-left font-montserrat text-xs leading-relaxed text-white/70">
				<input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
				<span>
					{consentLabel}{" "}
					<Link href="/privacy" className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
						Privacy
					</Link>
				</span>
			</label>

			{status === "error" ? (
				<p role="alert" className="mt-3 font-montserrat text-xs text-red-300">
					{error}
				</p>
			) : null}
		</form>
	);
}
