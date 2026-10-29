"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { animate } from "animejs";
import { Check, Copy, Share2, X } from "lucide-react";

import { PROMISE } from "@/lib/preorder/promise";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const mono = "font-(family-name:--font-pre-mono) uppercase tracking-[0.22em]";
const glass = "border border-(--pa-glass-line) bg-(--pa-glass) shadow-(--pa-glass-shadow) backdrop-blur-xl";
const panel = `rounded-[28px] border border-(--pa-glass-line) bg-(--pa-glass-strong) text-(--pa-text) shadow-(--pa-glass-shadow) backdrop-blur-2xl`;
const primary = `relative flex h-12 items-center justify-center overflow-hidden rounded-full border border-white/35 bg-(--pa-accent)/90 text-[12px] font-semibold text-white shadow-[0_10px_30px_-10px_var(--pa-accent-glow),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform hover:scale-[1.02] ${mono}`;
const ghost = `flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[11px] text-(--pa-text) transition-colors hover:text-(--pa-ochre-text) ${glass} ${mono}`;

/** Dialog shell: dims the scene, closes on Escape or a click outside, and rises in. */
function Modal({ label, onClose, children }) {
	const panel = useRef(null);
	const close = useEffectEvent(() => onClose());
	useEffect(() => {
		const onKey = (e) => e.key === "Escape" && close();
		window.addEventListener("keydown", onKey);
		const el = panel.current;
		const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		const a = el && !reduced ? animate(el, { opacity: [0, 1], translateY: [24, 0], duration: 500, ease: "outExpo" }) : null;
		el?.querySelector("input, select, button[data-autofocus]")?.focus({ preventScroll: true });
		return () => {
			window.removeEventListener("keydown", onKey);
			a?.revert();
		};
	}, []);
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={label}
			className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-black/35 p-3 backdrop-blur-md sm:items-center sm:p-6"
			onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div ref={panel} className="relative my-auto">
				<button
					type="button"
					onClick={onClose}
					aria-label="Close"
					className={`absolute -top-3 right-0 z-10 grid h-10 w-10 -translate-y-full place-items-center rounded-full text-(--pa-text) transition-colors hover:text-(--pa-ochre-text) ${glass}`}>
					<X className="h-4 w-4" aria-hidden="true" />
				</button>
				{children}
			</div>
		</div>
	);
}

/**
 * After paying: "I laid a brick for Hampi", with one-tap sharing. Every share
 * links back to the page with the same site already picked.
 */
export function ShareSheet({ share, onClose, onSeeBrick }) {
	const [copied, setCopied] = useState(false);
	const [canShare] = useState(() => typeof navigator.share === "function");
	const url = `${window.location.origin}/preorder${share.slug && share.slug !== "other" ? `?site=${share.slug}` : ""}`;
	const text = `I laid a brick for ${share.label} on Epocheye. The most-wanted heritage site goes live in the app for Diwali. Lay yours:`;
	const message = `${text} ${url}`;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
		} catch {
			// clipboard blocked: the link stays visible to copy by hand
		}
	};
	const nativeShare = () => navigator.share({ title: "Epocheye pre-order", text, url }).catch(() => {});

	return (
		<Modal label="Share your pre-order" onClose={onClose}>
			<div className={`relative w-[min(92vw,420px)] p-6 sm:p-8 ${panel}`}>
				<p className={`flex items-center gap-2 text-[10px] text-(--pa-ochre-text) ${mono}`}>
					<span className="h-1.5 w-1.5 rounded-full bg-(--pa-ochre) shadow-[0_0_10px_var(--pa-ochre)]" />
					{share.alreadyPaid ? "Already pre-ordered" : "Pre-order paid"} · {share.reference}
				</p>

				{/* The card people see: what they laid a brick for. */}
				<div className={`mt-5 rounded-3xl p-5 ${glass}`}>
					<div className="mb-4 grid w-max grid-cols-2 gap-1" aria-hidden="true">
						{[0, 1, 2, 3].map((i) => (
							<span key={i} className={`h-3 w-7 rounded-[4px] ${i === 3 ? "bg-(--pa-ochre)" : "bg-(--pa-accent)"} ${i > 1 ? "translate-x-2" : ""}`} />
						))}
					</div>
					<p className="font-(family-name:--font-pre-display) text-[15px] font-semibold uppercase tracking-[0.12em] text-(--pa-text-soft)">
						I laid a brick for
					</p>
					<p className="font-(family-name:--font-pre-display) text-4xl font-bold uppercase leading-none text-(--pa-accent-text)">{share.label}</p>
					<p className="mt-3 text-[15px] leading-snug text-(--pa-text-soft)">Help it go live in Epocheye for Diwali.</p>
				</div>

				<div className="mt-5 grid grid-cols-2 gap-2.5">
					<a
						href={`https://wa.me/?text=${encodeURIComponent(message)}`}
						target="_blank"
						rel="noopener noreferrer"
						data-autofocus
						className={`col-span-2 ${primary}`}>
						Share on WhatsApp
					</a>
					<a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={ghost}>
						Post on X
					</a>
					{canShare ? (
						<button type="button" onClick={nativeShare} className={ghost}>
							<Share2 className="h-3.5 w-3.5" aria-hidden="true" />
							More
						</button>
					) : (
						<button type="button" onClick={copy} className={ghost}>
							{copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
							{copied ? "Copied" : "Copy link"}
						</button>
					)}
				</div>

				<p className="mt-5 text-[14px] leading-relaxed text-(--pa-text-soft)">
					{`${PROMISE} We'll email you the day yours goes live.`}
				</p>
				<button type="button" onClick={onSeeBrick} className={`mt-5 text-[11px] text-(--pa-accent-text) hover:text-(--pa-ochre-text) ${mono}`}>
					{"See your brick on the board >"}
				</button>
			</div>
		</Modal>
	);
}

/** iPhone visitors leave an email and hear when Epocheye is on the App Store. */
export function IosSheet({ onClose }) {
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");

	async function onSubmit(e) {
		e.preventDefault();
		if (status === "sending") return;
		const data = new FormData(e.currentTarget);
		const email = String(data.get("email") || "").trim();
		if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
		setStatus("sending");
		setError("");
		try {
			const res = await fetch("/api/ios-waitlist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, website: data.get("website") || "" }),
			});
			const json = await res.json().catch(() => null);
			if (!res.ok || !json?.success) throw new Error(json?.error || "Something went wrong. Please try again.");
			setStatus("done");
		} catch (err) {
			setError(err.message);
			setStatus("idle");
		}
	}

	return (
		<Modal label="Get notified when Epocheye is on iPhone" onClose={onClose}>
			<div className={`w-[min(92vw,400px)] p-6 sm:p-8 ${panel}`}>
				<p className={`text-[10px] text-(--pa-ochre-text) ${mono}`}>{"> iPhone · App Store"}</p>
				<h3 className="mt-2 font-(family-name:--font-pre-display) text-2xl font-bold uppercase leading-tight">Epocheye is coming to iPhone</h3>
				{status === "done" ? (
					<p role="status" className="mt-4 text-[15px] leading-relaxed text-(--pa-text-soft)">
						You&apos;re on the list. We&apos;ll email you the day Epocheye is on the App Store.
					</p>
				) : (
					<form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-3">
						<p className="text-[15px] leading-relaxed text-(--pa-text-soft)">
							It&apos;s on Android today. Leave your email and we&apos;ll tell you the day it&apos;s on the App Store. Your pre-order
							works either way.
						</p>
						<label htmlFor="ios-email" className="sr-only">
							Email
						</label>
						<input
							id="ios-email"
							name="email"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							className={`w-full rounded-full px-5 py-3 text-[16px] text-(--pa-text) outline-none transition-colors placeholder:text-(--pa-text-muted) focus:border-(--pa-accent) ${glass}`}
						/>
						{/* Honeypot: hidden from people, filled by bots. */}
						<div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
							<input name="website" tabIndex={-1} autoComplete="off" />
						</div>
						<p aria-live="polite" className="min-h-[1rem] text-[13px] text-(--pa-error)">
							{error}
						</p>
						<button
							type="submit"
							disabled={status === "sending"}
							className={`${primary} disabled:cursor-wait disabled:opacity-70`}>
							{status === "sending" ? "Adding you…" : "Notify me"}
						</button>
					</form>
				)}
			</div>
		</Modal>
	);
}
