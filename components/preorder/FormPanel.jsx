"use client";

import { useState } from "react";

import { formatPrice } from "@/lib/preorder/price";
import { PROMISE, PROMISE_SHORT, REFUND_BY } from "@/lib/preorder/promise";
import { OTHER_SITE } from "@/lib/preorder/sites";
import { payForPreorder } from "./checkout";

const EMPTY = { name: "", email: "", suggestion: "", marketingOk: false, website: "" };

// Colours come from the CSS variables set by the page (theme.js cssVars), so
// the form follows the light/dark switch even inside the 3D scene.
const field =
	"w-full rounded-2xl border border-(--pa-glass-line) bg-(--pa-glass) px-4 py-3 backdrop-blur-xl font-(family-name:--font-pre-mono) text-[14px] text-(--pa-text) outline-none transition-colors placeholder:text-(--pa-text-muted) focus:border-(--pa-accent) focus:shadow-[0_0_0_3px_var(--pa-accent-glow)]";
const label = "mb-2 block font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.24em] text-(--pa-accent-text)";

/**
 * The pre-order form, on a frosted-glass panel. Rendered as real DOM: placed in the
 * 3D scene through drei's <Html transform>, or flat in the no-WebGL fallback.
 */
export default function FormPanel({ sites, price, selected, onSelect, onDone, narrow = false }) {
	const [form, setForm] = useState(EMPTY);
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
	const site = sites.find((s) => s.slug === selected);
	const priceLabel = formatPrice(price);

	async function onSubmit(e) {
		e.preventDefault();
		if (status === "sending") return;
		setStatus("sending");
		setError("");
		try {
			const label = site ? site.name : form.suggestion;
			const paid = await payForPreorder({ form, site: selected, siteLabel: label });
			setResult({ ...paid, label });
			setStatus("done");
			onDone?.({ slug: selected, label, ...paid });
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

	return (
		<div
			className={`${narrow ? "w-[340px] p-6" : "w-[440px] p-8"} relative rounded-[28px] border border-(--pa-glass-line) bg-(--pa-glass-strong) text-(--pa-text) shadow-(--pa-glass-shadow) backdrop-blur-2xl`}>
			{status === "done" && result ? (
				<div role="status">
					<p className="mb-5 flex items-center gap-2 font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.24em] text-(--pa-ochre-text)">
						<span className="h-1.5 w-1.5 rounded-full bg-(--pa-ochre) shadow-[0_0_10px_var(--pa-ochre)]" />
						{result.alreadyPaid ? "Already pre-ordered" : "Pre-order paid"}
					</p>
					<h3 className="font-(family-name:--font-pre-display) text-2xl font-bold uppercase leading-tight">
						{result.label}
						<span className="mt-1 block text-(--pa-ochre-text)">+1 on the board.</span>
					</h3>
					<p className="mt-4 text-sm leading-relaxed text-(--pa-text-soft)">
						{`${PROMISE} We'll email you the day yours goes live so you can see it first.`}
					</p>
					<p className="mt-7 font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.24em] text-(--pa-accent-text)">Reference</p>
					<p className="font-(family-name:--font-pre-mono) text-3xl tracking-[0.14em]">{result.reference}</p>
					<button
						type="button"
						onClick={another}
						className="mt-8 w-full rounded-full border border-(--pa-accent) py-3 font-(family-name:--font-pre-mono) text-[11px] uppercase tracking-[0.22em] text-(--pa-accent-text) transition-colors hover:bg-(--pa-accent) hover:text-white">
						Pre-order another site
					</button>
				</div>
			) : (
				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
					<div>
						<p className="font-(family-name:--font-pre-mono) text-[10px] uppercase tracking-[0.24em] text-(--pa-ochre-text)">{`> pre-order${priceLabel ? ` · ${priceLabel}` : ""} · ${PROMISE_SHORT}`}</p>
						<h3 className="mt-2 font-(family-name:--font-pre-display) text-2xl font-bold uppercase leading-tight">Which site do you want to see?</h3>
					</div>

					<div>
						<label htmlFor="po-site" className={label}>
							Site
						</label>
						<select id="po-site" value={selected} onChange={(e) => onSelect(e.target.value)} className={`${field} appearance-none`}>
							{sites.map((s) => (
								<option key={s.slug} value={s.slug}>
									{s.name}, {s.place}
								</option>
							))}
							<option value={OTHER_SITE}>Another site…</option>
						</select>
					</div>

					{selected === OTHER_SITE && (
						<div>
							<label htmlFor="po-suggestion" className={label}>
								Which site?
							</label>
							<input
								id="po-suggestion"
								value={form.suggestion}
								onChange={set("suggestion")}
								placeholder="e.g. Chittorgarh Fort"
								className={field}
							/>
						</div>
					)}

					<div className={narrow ? "flex flex-col gap-5" : "grid grid-cols-2 gap-4"}>
						<div>
							<label htmlFor="po-name" className={label}>
								Name
							</label>
							<input id="po-name" autoComplete="name" value={form.name} onChange={set("name")} className={field} />
						</div>
						<div>
							<label htmlFor="po-email" className={label}>
								Email
							</label>
							<input id="po-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className={field} />
						</div>
					</div>

					{/* Honeypot: hidden from people, filled by bots. */}
					<div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
						<label htmlFor="po-website">Website</label>
						<input id="po-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
					</div>

					<label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-(--pa-text-soft)">
						<input type="checkbox" checked={form.marketingOk} onChange={set("marketingOk")} className="mt-0.5 h-4 w-4 shrink-0 accent-(--pa-accent)" />
						Also email me when other sites open in Epocheye.
					</label>

					<div aria-live="polite" className="min-h-[1rem] font-(family-name:--font-pre-mono) text-[12px] text-(--pa-error)">
						{error}
					</div>

					<button
						type="submit"
						disabled={status === "sending"}
						className="group relative h-14 overflow-hidden rounded-full bg-(--pa-accent) font-(family-name:--font-pre-mono) text-[13px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_10px_40px_-8px_var(--pa-accent-glow)] disabled:cursor-wait disabled:opacity-70">
						<span className="absolute inset-0 origin-left scale-x-0 bg-(--pa-ochre) transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
						<span className="relative transition-colors duration-500 group-hover:text-black">
							{status === "sending"
								? "Opening payment…"
								: `${priceLabel ? `Pay ${priceLabel} · ` : ""}Pre-order ${site ? site.name : "this site"} →`}
						</span>
					</button>

					<p className="text-[11px] leading-relaxed text-(--pa-text-muted)">
						{`Payment by Razorpay. Full refund if your site isn't live by ${REFUND_BY}. We use these details only for your pre-order, as set out in our `}
						{/* Plain <a>: inside the 3D scene this renders in its own React root, outside the router. */}
						<a href="/privacy" className="underline underline-offset-2 hover:text-(--pa-text)">
							privacy policy
						</a>
						.
					</p>
				</form>
			)}
		</div>
	);
}
