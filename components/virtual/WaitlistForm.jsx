"use client";

import { useState } from "react";
import Link from "next/link";
import { trackVirtual, utmParams } from "./track";

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
			<p role="status" className="font-montserrat text-lg text-white">
				{successMessage}
			</p>
		);
	}

	return (
		<form onSubmit={onSubmit} className="relative w-full max-w-md">
			<div className="flex flex-col gap-3 sm:flex-row">
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
					placeholder="you@example.com"
					className="h-12 w-full rounded-full sm:flex-1 border border-white/15 bg-white/5 px-5 font-instrument-sans text-base text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
				/>
				<button
					type="submit"
					disabled={status === "submitting"}
					className="h-12 shrink-0 rounded-full border border-white/70 px-6 font-montserrat text-sm font-medium text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50">
					{buttonLabel}
				</button>
			</div>
			<p className="mt-3 font-instrument-sans text-sm text-white/50">{note}</p>

			{/* Honeypot: off-screen and skipped by keyboard and assistive tech. */}
			<div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
				<label>
					Website
					<input type="text" name="website" tabIndex={-1} autoComplete="off" />
				</label>
			</div>

			<label className="mt-4 flex cursor-pointer items-start gap-3 font-instrument-sans text-sm text-white/70">
				<input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-white" />
				<span>
					{consentLabel}{" "}
					<Link href="/privacy" className="text-white underline decoration-white/30 hover:decoration-white">
						Privacy
					</Link>
				</span>
			</label>

			{status === "error" ? (
				<p role="alert" className="mt-3 font-instrument-sans text-sm text-red-300">
					{error}
				</p>
			) : null}
		</form>
	);
}
