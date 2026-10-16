"use client";

import { useState } from "react";
import Link from "next/link";
import { trackVirtual, utmParams } from "./track";

// Early-access form. `onDark` for the hero (over the video), light otherwise.
// id="early-access" is the target of the header button and the sticky mobile button.
export default function WaitlistForm({ buttonLabel, note, consentLabel, successMessage, onDark = false }) {
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

	const ink = onDark ? "text-white" : "text-[#2e1f16]";
	const soft = onDark ? "text-white/80" : "text-[#5c4636]";

	if (status === "success") {
		return (
			<p id="early-access" role="status" className={`font-instrument-serif text-3xl ${ink}`}>
				{successMessage}
			</p>
		);
	}

	return (
		<form id="early-access" onSubmit={onSubmit} className="relative w-full max-w-lg scroll-mt-28">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
					className={`h-12 w-full border-0 border-b bg-transparent px-0 font-instrument-sans text-lg focus:outline-none focus:ring-0 sm:flex-1 ${
						onDark
							? "border-white/70 text-white placeholder:text-white/60 focus:border-white"
							: "border-[#2e1f16]/40 text-[#2e1f16] placeholder:text-[#5c4636]/60 focus:border-[#2e1f16]"
					}`}
				/>
				<button
					type="submit"
					disabled={status === "submitting"}
					className="h-12 shrink-0 bg-[#c0614a] px-7 font-instrument-sans text-base font-medium text-white transition-colors duration-500 hover:bg-[#a44f3b] disabled:opacity-60">
					{buttonLabel}
				</button>
			</div>

			<p className={`mt-3 font-instrument-sans text-sm ${soft}`}>{note}</p>

			{/* Honeypot: off-screen and skipped by keyboard and assistive tech. */}
			<div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
				<label>
					Website
					<input type="text" name="website" tabIndex={-1} autoComplete="off" />
				</label>
			</div>

			<label className={`mt-4 flex cursor-pointer items-start gap-3 font-instrument-sans text-sm leading-relaxed ${soft}`}>
				<input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[#c0614a]" />
				<span>
					{consentLabel}{" "}
					<Link href="/privacy" className={`underline underline-offset-2 ${ink}`}>
						Privacy
					</Link>
				</span>
			</label>

			{status === "error" ? (
				<p role="alert" className={`mt-3 font-instrument-sans text-sm ${onDark ? "text-[#ffd0c4]" : "text-[#a44f3b]"}`}>
					{error}
				</p>
			) : null}
		</form>
	);
}
