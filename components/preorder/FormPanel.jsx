"use client";

import { useState } from "react";

import { OTHER_SITE } from "@/lib/preorder/sites";

const EMPTY = { name: "", email: "", suggestion: "", marketingOk: false, website: "" };

const field =
	"w-full rounded-xl border border-[#7b2fff]/40 bg-[#07040f]/70 px-4 py-3 text-[15px] text-[#f2efe6] outline-none transition-colors placeholder:text-[#f2efe6]/30 focus:border-[#ccff00]";
const label = "mb-2 block font-mono text-[10px] uppercase tracking-[0.22em] text-[#b28cff]";

/**
 * The pre-order form. Rendered as real DOM: placed in the 3D scene through
 * drei's <Html transform>, or flat in the no-WebGL fallback.
 */
export default function FormPanel({ sites, selected, onSelect, onDone, narrow = false }) {
	const [form, setForm] = useState(EMPTY);
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
	const site = sites.find((s) => s.slug === selected);

	async function onSubmit(e) {
		e.preventDefault();
		if (status === "sending") return;
		setStatus("sending");
		setError("");
		try {
			const res = await fetch("/api/preorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...form, site: selected }),
			});
			const json = await res.json().catch(() => null);
			if (!res.ok || !json?.success) throw new Error(json?.error || "Something went wrong. Please try again.");
			const label = site ? site.name : form.suggestion;
			setResult({ ...json.data, label });
			setStatus("done");
			onDone?.({ slug: selected, ...json.data });
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
			className={`${narrow ? "w-[340px] p-6" : "w-[440px] p-8"} rounded-[28px] border border-[#7b2fff]/50 bg-[#120a24]/90 text-[#f2efe6] shadow-[0_0_80px_-10px_rgba(123,47,255,0.55)] backdrop-blur-md`}>
			{status === "done" && result ? (
				<div role="status">
					<p className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#ccff00]">
						<span className="h-1.5 w-1.5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
						{result.created ? "Pre-order received" : "Already pre-ordered"}
					</p>
					<h3 className="font-montserrat text-3xl font-semibold leading-tight">
						{result.label}
						<span className="block font-instrument-serif text-4xl font-normal italic text-[#ccff00]">is on the board.</span>
					</h3>
					<p className="mt-4 text-sm leading-relaxed text-[#f2efe6]/65">
						Nothing has been charged. The most-wanted sites are built first, and we will email you when yours is ready
						so you can see it first.
					</p>
					<p className="mt-7 font-mono text-[10px] uppercase tracking-[0.22em] text-[#b28cff]">Your reference</p>
					<p className="font-mono text-3xl tracking-[0.12em]">{result.reference}</p>
					<button
						type="button"
						onClick={another}
						className="mt-8 w-full rounded-full border border-[#7b2fff] py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#f2efe6] transition-colors hover:border-[#ccff00] hover:text-[#ccff00]">
						Pre-order another site
					</button>
				</div>
			) : (
				<form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#ccff00]">Pre-order · nothing to pay</p>
						<h3 className="mt-2 font-montserrat text-2xl font-semibold leading-tight">Which site do you want to see?</h3>
					</div>

					<div>
						<label htmlFor="po-site" className={label}>
							Site
						</label>
						<select id="po-site" value={selected} onChange={(e) => onSelect(e.target.value)} className={`${field} appearance-none`}>
							{sites.map((s) => (
								<option key={s.slug} value={s.slug} className="bg-[#120a24]">
									{s.name}, {s.place}
								</option>
							))}
							<option value={OTHER_SITE} className="bg-[#120a24]">
								Another site…
							</option>
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

					<label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-[#f2efe6]/65">
						<input type="checkbox" checked={form.marketingOk} onChange={set("marketingOk")} className="mt-0.5 h-4 w-4 shrink-0 accent-[#ccff00]" />
						Also email me when other sites open in Epocheye.
					</label>

					<div aria-live="polite" className="min-h-[1rem] text-[13px] text-[#ff7a9a]">
						{error}
					</div>

					<button
						type="submit"
						disabled={status === "sending"}
						className="h-14 rounded-full bg-[#ccff00] font-montserrat text-[15px] font-semibold text-[#07040f] shadow-[0_0_40px_-6px_rgba(204,255,0,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">
						{status === "sending" ? "Sending…" : `Pre-order ${site ? site.name : "this site"} →`}
					</button>

					<p className="text-[11px] leading-relaxed text-[#f2efe6]/40">
						Nothing is charged. We use these details only for your pre-order, as set out in our{" "}
						{/* Plain <a>: inside the 3D scene this renders in its own React root, outside the router. */}
						<a href="/privacy" className="underline underline-offset-2 hover:text-[#f2efe6]">
							privacy policy
						</a>
						.
					</p>
				</form>
			)}
		</div>
	);
}
