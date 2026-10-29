"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, svg } from "animejs";
import { Check, Plus } from "lucide-react";

import { formatPrice } from "@/lib/preorder/price";
import { OTHER_SITE } from "@/lib/preorder/sites";
import { payForPreorder } from "./checkout";

const EMPTY = { name: "", email: "", suggestion: "", marketingOk: false, website: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const input =
	"h-12 w-full rounded-xl border border-transparent bg-(--pa-surface-2) px-4 text-[16px] text-(--pa-text) outline-none transition placeholder:text-(--pa-text-muted) focus:border-(--pa-accent) focus:bg-(--pa-surface) focus:ring-4 focus:ring-(--pa-accent-soft)";
const label = "mb-2 block text-[13px] font-medium text-(--pa-text-soft)";
const step = "mb-4 text-[13px] font-semibold uppercase tracking-[0.12em] text-(--pa-text-muted)";

/** The tick draws itself once the pre-order is confirmed. */
function DoneMark() {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
		const a = animate(svg.createDrawable(el.querySelectorAll("circle, path")), {
			draw: ["0 0", "0 1"],
			duration: 700,
			delay: (_, i) => i * 350,
			ease: "inOutQuad",
		});
		return () => a.revert();
	}, []);
	return (
		<svg ref={ref} width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="var(--pa-accent)" strokeWidth="3" aria-hidden="true">
			<circle cx="32" cy="32" r="29" />
			<path d="M20 33l8 8 16-17" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/**
 * Checkout for one pre-order: pick a site, add your details, pay in Razorpay
 * Checkout. Paid pre-orders count on the board straight away.
 */
export default function PreorderForm({ sites, counts, price, selected, onSelect, onDone, onSeeBoard }) {
	const [form, setForm] = useState(EMPTY);
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
	const site = sites.find((s) => s.slug === selected);
	const priceLabel = formatPrice(price);
	const siteLabel = site ? site.name : form.suggestion.trim() || "Your own pick";

	async function onSubmit(e) {
		e.preventDefault();
		if (status === "sending") return;
		if (form.name.trim().length < 2) return setError("Please enter your name.");
		if (!EMAIL_RE.test(form.email.trim())) return setError("Please enter a valid email address.");
		if (selected === OTHER_SITE && form.suggestion.trim().length < 3) return setError("Tell us which site you want.");
		setStatus("sending");
		setError("");
		try {
			const paid = await payForPreorder({ form, site: selected, siteLabel });
			setResult({ ...paid, label: siteLabel });
			setStatus("done");
			onDone?.({ slug: selected, ...paid });
		} catch (err) {
			setError(err.message);
			setStatus("idle");
		}
	}

	function another() {
		setForm((f) => ({ ...EMPTY, name: f.name, email: f.email, marketingOk: f.marketingOk }));
		setResult(null);
		setStatus("idle");
	}

	if (status === "done" && result) {
		return (
			<div role="status" className="flex flex-col items-center px-2 py-6 text-center">
				<DoneMark />
				<h3 className="mt-6 text-3xl font-semibold tracking-tight text-(--pa-text)">
					{result.alreadyPaid ? "You already have this one." : "You're in."}
				</h3>
				<p className="mt-3 max-w-md text-[17px] leading-relaxed text-(--pa-text-soft)">
					{`Your pre-order for ${result.label} is confirmed. We'll email you the day it goes live, and if we don't build it, you get a full refund.`}
				</p>
				<p className="mt-6 text-[13px] font-medium uppercase tracking-[0.12em] text-(--pa-text-muted)">Reference</p>
				<p className="mt-1 font-(family-name:--font-geist-mono) text-2xl tracking-[0.12em] text-(--pa-text)">{result.reference}</p>
				<div className="mt-8 flex flex-wrap justify-center gap-3">
					<button
						type="button"
						onClick={onSeeBoard}
						className="h-12 rounded-full bg-(--pa-accent) px-6 text-[15px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover)">
						See the most wanted
					</button>
					<button
						type="button"
						onClick={another}
						className="h-12 rounded-full border border-(--pa-line) px-6 text-[15px] font-medium text-(--pa-text) transition hover:bg-(--pa-surface-2)">
						Pre-order another site
					</button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} noValidate>
			<p className={step}>1 · Choose a site</p>
			<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Site to pre-order">
				{sites.map((s) => {
					const on = s.slug === selected;
					const n = counts?.[s.slug];
					return (
						<button
							key={s.slug}
							type="button"
							role="radio"
							aria-checked={on}
							onClick={() => onSelect(s.slug)}
							className={`rounded-2xl border px-4 py-3 text-left transition ${
								on
									? "border-(--pa-accent) bg-(--pa-accent-soft) ring-1 ring-(--pa-accent)"
									: "border-(--pa-line) hover:border-(--pa-text-muted) hover:bg-(--pa-surface-2)"
							}`}>
							<span className="block text-[15px] font-medium leading-snug text-(--pa-text)">{s.name}</span>
							<span className="mt-0.5 block text-[12px] text-(--pa-text-muted)">
								{s.place}
								{n ? ` · ${n} pre-order${n === 1 ? "" : "s"}` : ""}
							</span>
						</button>
					);
				})}
				<button
					type="button"
					role="radio"
					aria-checked={selected === OTHER_SITE}
					onClick={() => onSelect(OTHER_SITE)}
					className={`flex items-center gap-2 rounded-2xl border border-dashed px-4 py-3 text-left transition ${
						selected === OTHER_SITE
							? "border-(--pa-accent) bg-(--pa-accent-soft) text-(--pa-text)"
							: "border-(--pa-line) text-(--pa-text-soft) hover:border-(--pa-text-muted)"
					}`}>
					<Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="text-[15px] font-medium">Another site</span>
				</button>
			</div>

			{selected === OTHER_SITE && (
				<div className="mt-4">
					<label htmlFor="po-suggestion" className={label}>
						Which site?
					</label>
					<input id="po-suggestion" value={form.suggestion} onChange={set("suggestion")} placeholder="e.g. Chittorgarh Fort" className={input} />
				</div>
			)}

			<p className={`${step} mt-10`}>2 · Your details</p>
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<label htmlFor="po-name" className={label}>
						Name
					</label>
					<input id="po-name" autoComplete="name" value={form.name} onChange={set("name")} className={input} />
				</div>
				<div>
					<label htmlFor="po-email" className={label}>
						Email
					</label>
					<input id="po-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className={input} />
				</div>
			</div>

			{/* Honeypot: hidden from people, filled by bots. */}
			<div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
				<label htmlFor="po-website">Website</label>
				<input id="po-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
			</div>

			<label className="mt-5 flex cursor-pointer items-center gap-3 text-[14px] text-(--pa-text-soft)">
				<span className="relative grid h-5 w-5 shrink-0 place-items-center">
					<input type="checkbox" checked={form.marketingOk} onChange={set("marketingOk")} className="peer absolute inset-0 cursor-pointer opacity-0" />
					<span className="h-5 w-5 rounded-md border border-(--pa-line) bg-(--pa-surface-2) transition peer-checked:border-(--pa-accent) peer-checked:bg-(--pa-accent) peer-focus-visible:ring-4 peer-focus-visible:ring-(--pa-accent-soft)" />
					<Check className="pointer-events-none absolute h-3.5 w-3.5 text-(--pa-on-accent) opacity-0 peer-checked:opacity-100" aria-hidden="true" />
				</span>
				Also email me when other sites open in Epocheye.
			</label>

			<div className="mt-10 flex items-baseline justify-between border-t border-(--pa-line) pt-6">
				<div>
					<p className="text-[13px] text-(--pa-text-muted)">Pre-order</p>
					<p className="text-[17px] font-medium text-(--pa-text)">{siteLabel}</p>
				</div>
				<p className="text-2xl font-semibold tracking-tight text-(--pa-text)">{priceLabel || "–"}</p>
			</div>

			<p aria-live="polite" className="mt-4 min-h-[1.25rem] text-[14px] text-(--pa-error)">
				{error}
			</p>

			<button
				type="submit"
				disabled={status === "sending"}
				className="mt-2 h-14 w-full rounded-full bg-(--pa-accent) text-[17px] font-medium text-(--pa-on-accent) transition hover:bg-(--pa-accent-hover) active:scale-[0.99] disabled:cursor-wait disabled:opacity-70">
				{status === "sending" ? "Opening secure payment…" : priceLabel ? `Pay ${priceLabel}` : "Continue to payment"}
			</button>

			<p className="mt-4 text-center text-[13px] leading-relaxed text-(--pa-text-muted)">
				Full refund if we don&apos;t build it. Secure payment by Razorpay. We use your details only for this pre-order, as set out in our{" "}
				<Link href="/privacy" className="underline underline-offset-2 hover:text-(--pa-text)">
					privacy policy
				</Link>
				.
			</p>
		</form>
	);
}
