"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { animate, svg } from "animejs";

import { formatPrice } from "@/lib/preorder/price";
import { OTHER_SITE } from "@/lib/preorder/sites";
import { payForPreorder } from "./checkout";

const EMPTY = { name: "", email: "", suggestion: "", marketingOk: false, website: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const field =
	"pa-serif w-full border-0 border-b border-(--pa-line-strong) bg-transparent pb-2 pt-1 text-[20px] font-light text-(--pa-text) outline-none transition-colors placeholder:text-(--pa-text-muted) focus:border-(--pa-text)";
const label = "pa-caps mb-2 block text-(--pa-text-muted)";
export const boxedButton =
	"pa-caps inline-flex h-12 items-center justify-center border border-(--pa-line-strong) px-9 text-(--pa-text) transition-colors hover:border-(--pa-text) hover:bg-(--pa-text) hover:text-(--pa-bg) disabled:cursor-wait disabled:opacity-60";

/** A ring that draws itself once the pre-order is confirmed. */
function DoneMark() {
	const ref = useRef(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
		const a = animate(svg.createDrawable(el.querySelectorAll("circle")), { draw: ["0 0", "0 1"], duration: 1400, delay: (_, i) => i * 200, ease: "inOutQuad" });
		return () => a.revert();
	}, []);
	return (
		<svg ref={ref} width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="currentColor" aria-hidden="true" className="text-(--pa-text-soft)">
			<circle cx="48" cy="48" r="46" strokeWidth="1" />
			<circle cx="48" cy="48" r="38" strokeWidth="0.75" opacity="0.6" />
		</svg>
	);
}

/**
 * Checkout for one pre-order: choose a site, sign the ledger, pay in Razorpay
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
		if (form.name.trim().length < 2) return setError("Please write your name.");
		if (!EMAIL_RE.test(form.email.trim())) return setError("That email doesn't look right.");
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
			<div role="status" className="flex flex-col items-center py-6 text-center">
				<div className="relative grid place-items-center">
					<DoneMark />
					<span className="pa-serif absolute text-[22px] font-light italic text-(--pa-text)">{result.alreadyPaid ? "kept" : "yours"}</span>
				</div>
				<h3 className="pa-serif mt-8 text-[44px] font-extralight leading-none tracking-[-0.01em] text-(--pa-text)">
					{result.alreadyPaid ? (
						<>
							Already <em className="italic">yours.</em>
						</>
					) : (
						<>
							You&apos;re <em className="italic">in.</em>
						</>
					)}
				</h3>
				<p className="pa-serif mt-5 max-w-md text-[16px] font-light leading-relaxed text-(--pa-text-soft)">
					{`Your pre-order for ${result.label} is confirmed. We'll write the day it opens, and if we don't build it, you get a full refund.`}
				</p>
				<p className="pa-caps mt-8 text-(--pa-text-muted)">Reference</p>
				<p className="pa-caps mt-2 text-[13px] tracking-[0.4em] text-(--pa-text)">{result.reference}</p>
				<div className="mt-10 flex flex-wrap justify-center gap-3">
					<button type="button" onClick={onSeeBoard} className={boxedButton}>
						See the most wanted
					</button>
					<button type="button" onClick={another} className="pa-caps h-12 px-6 text-(--pa-text-muted) underline-offset-4 transition-colors hover:text-(--pa-text) hover:underline">
						Pre-order another
					</button>
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={onSubmit} noValidate>
			<p className={label}>I · Choose a site</p>
			<div className="mt-4 grid grid-cols-1 border-t border-(--pa-line) sm:grid-cols-2 sm:gap-x-8" role="radiogroup" aria-label="Site to pre-order">
				{[...sites, null].map((s) => {
					const slug = s ? s.slug : OTHER_SITE;
					const on = slug === selected;
					const n = s ? counts?.[s.slug] : null;
					return (
						<button
							key={slug}
							type="button"
							role="radio"
							aria-checked={on}
							onClick={() => onSelect(slug)}
							className="group flex items-baseline justify-between gap-3 border-b border-(--pa-line) py-2.5 text-left">
							<span className={`pa-serif text-[17px] font-light transition-colors ${on ? "text-(--pa-text)" : "text-(--pa-text-muted) group-hover:text-(--pa-text-soft)"}`}>
								<span className={`mr-2 inline-block w-2 transition-opacity ${on ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
									·
								</span>
								{s ? s.name : <em className="italic">Another site</em>}
							</span>
							<span className="pa-caps shrink-0 text-[9px] text-(--pa-text-muted)">{s ? `${s.place}${n ? ` · ${n}` : ""}` : "your own"}</span>
						</button>
					);
				})}
			</div>

			{selected === OTHER_SITE && (
				<div className="mt-6">
					<label htmlFor="po-suggestion" className={label}>
						Which site
					</label>
					<input id="po-suggestion" value={form.suggestion} onChange={set("suggestion")} placeholder="Chittorgarh Fort" className={field} />
				</div>
			)}

			<p className={`${label} mt-10`}>II · Your name in the ledger</p>
			<div className="mt-4 grid gap-6 sm:grid-cols-2">
				<div>
					<label htmlFor="po-name" className="sr-only">
						Name
					</label>
					<input id="po-name" autoComplete="name" value={form.name} onChange={set("name")} placeholder="Your name" className={field} />
				</div>
				<div>
					<label htmlFor="po-email" className="sr-only">
						Email
					</label>
					<input id="po-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={field} />
				</div>
			</div>

			{/* Honeypot: hidden from people, filled by bots. */}
			<div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
				<label htmlFor="po-website">Website</label>
				<input id="po-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
			</div>

			<label className="pa-serif mt-6 flex cursor-pointer items-center gap-3 text-[15px] font-light text-(--pa-text-soft)">
				<input type="checkbox" checked={form.marketingOk} onChange={set("marketingOk")} className="peer sr-only" />
				<span className="grid h-3.5 w-3.5 place-items-center border border-(--pa-line-strong) peer-checked:bg-(--pa-text) peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--pa-text)" />
				Write to me when other sites open.
			</label>

			<div className="mt-10 flex items-end justify-between border-t border-(--pa-line) pt-6">
				<div>
					<p className="pa-caps text-(--pa-text-muted)">III · The pre-order</p>
					<p className="pa-serif mt-2 text-[22px] font-light text-(--pa-text)">{siteLabel}</p>
				</div>
				<p className="pa-serif text-[34px] font-extralight leading-none text-(--pa-text)">{priceLabel || "—"}</p>
			</div>

			<p aria-live="polite" className="pa-serif mt-4 min-h-[1.5rem] text-[15px] italic text-(--pa-error)">
				{error}
			</p>

			<div className="mt-4 flex flex-col items-center gap-4">
				<button type="submit" disabled={status === "sending"} className={`${boxedButton} w-full sm:w-auto sm:min-w-[260px]`}>
					{status === "sending" ? "Opening payment" : priceLabel ? `Pay ${priceLabel}` : "Continue to payment"}
				</button>
				<p className="pa-serif text-center text-[14px] font-light italic text-(--pa-text-muted)">
					Full refund if we don&apos;t build it. Payment by Razorpay. Your details serve this pre-order only, per our{" "}
					<Link href="/privacy" className="underline underline-offset-2 hover:text-(--pa-text)">
						privacy policy
					</Link>
					.
				</p>
			</div>
		</form>
	);
}
