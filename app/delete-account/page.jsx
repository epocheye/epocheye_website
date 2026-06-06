"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { BGPattern } from "@/components/ui/bg-pattern";

const EASE = [0.22, 1, 0.36, 1];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DeleteAccountPage() {
	const [email, setEmail] = useState("");
	const [reason, setReason] = useState("");
	const [status, setStatus] = useState("idle"); // idle | submitting | success | error
	const [errorMsg, setErrorMsg] = useState("");

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
			const res = await fetch("/api/account-deletion", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: value, reason: reason.trim() }),
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
		<main className="relative isolate min-h-screen bg-[#080808] overflow-hidden">
			<BGPattern variant="grid" mask="fade-edges" fill="rgba(255,255,255,0.07)" />

			<section className="relative z-10 max-w-xl mx-auto px-6 sm:px-10 py-20 sm:py-28">
				<Link
					href="/"
					className="text-xs text-white/40 hover:text-white/70 uppercase tracking-widest font-instrument-sans">
					← Back to home
				</Link>

				<header className="mt-8 mb-10">
					<h1 className="font-instrument-serif text-4xl sm:text-5xl text-white">
						Delete your account
					</h1>
					<p className="mt-5 text-white/60 leading-relaxed font-instrument-sans">
						If you created an Epocheye account in the app, you can request to
						have it deleted here. Submit the email address linked to your
						account and we&apos;ll process the deletion of your account and its
						associated data.
					</p>
				</header>

				<AnimatePresence mode="wait">
					{status === "success" ? (
						<motion.div
							key="success"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, ease: EASE }}
							className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 font-instrument-sans">
							<h2 className="font-instrument-serif text-2xl text-white">
								Request received
							</h2>
							<p className="mt-3 text-white/60 leading-relaxed">
								We&apos;ve received your account-deletion request. We&apos;ll
								process it and follow up at the email you provided if we need
								anything further.
							</p>
						</motion.div>
					) : (
						<motion.form
							key="form"
							onSubmit={handleSubmit}
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, ease: EASE }}
							className="space-y-5 font-instrument-sans"
							noValidate>
							<div>
								<label
									htmlFor="email"
									className="block text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-2">
									Account email
								</label>
								<input
									id="email"
									type="email"
									inputMode="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@email.com"
									disabled={status === "submitting"}
									className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/40 disabled:opacity-50"
								/>
							</div>

							<div>
								<label
									htmlFor="reason"
									className="block text-[11px] font-semibold tracking-widest uppercase text-white/40 mb-2">
									Reason <span className="normal-case tracking-normal text-white/30">(optional)</span>
								</label>
								<textarea
									id="reason"
									rows={4}
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									placeholder="Let us know why you're leaving (optional)."
									disabled={status === "submitting"}
									maxLength={2000}
									className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/40 disabled:opacity-50"
								/>
							</div>

							<button
								type="submit"
								disabled={status === "submitting"}
								className="group inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-all duration-500 hover:bg-white hover:text-black disabled:opacity-50">
								{status === "submitting" ? "Submitting" : "Submit deletion request"}
								<ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
							</button>

							<AnimatePresence>
								{status === "error" && errorMsg && (
									<motion.p
										initial={{ opacity: 0, y: -4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										className="text-sm text-red-300/80">
										{errorMsg}
									</motion.p>
								)}
							</AnimatePresence>
						</motion.form>
					)}
				</AnimatePresence>
			</section>
		</main>
	);
}
