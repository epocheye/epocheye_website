"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { DecryptedText, EASE } from "./fx";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The next six months, starting with this one. Client-only module (loaded with
// ssr: false), so the visitor's own clock decides "this month".
function nextMonths() {
	const now = new Date();
	return Array.from({ length: 6 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
		const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		return { value, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
	});
}

const EMPTY = { name: "", email: "", phone: "", monument: LIVE_MONUMENTS[0].slug, visitMonth: "", marketingOk: false, website: "" };

const inputCls =
	"peer w-full border-b border-rule bg-transparent pb-3 pt-6 text-lg text-bone outline-none transition-colors placeholder:text-transparent focus:border-signal";
const labelCls =
	"pointer-events-none absolute left-0 top-6 origin-left font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted transition-all duration-300 peer-focus:top-0 peer-focus:text-signal peer-[:not(:placeholder-shown)]:top-0";

function Field({ id, label, ...props }) {
	return (
		<div className="relative">
			<input id={id} name={id} placeholder={label} className={inputCls} {...props} />
			<label htmlFor={id} className={labelCls}>
				{label}
			</label>
		</div>
	);
}

export default function ReserveForm() {
	const reduced = useReducedMotion();
	const [months] = useState(nextMonths);
	const [form, setForm] = useState(EMPTY);
	const [status, setStatus] = useState("idle"); // idle | sending | done
	const [error, setError] = useState("");
	const [result, setResult] = useState(null);

	const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
	const monument = LIVE_MONUMENTS.find((m) => m.slug === form.monument);

	async function onSubmit(e) {
		e.preventDefault();
		if (status === "sending") return;
		setStatus("sending");
		setError("");
		try {
			const res = await fetch("/api/preorder", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(form),
			});
			const json = await res.json().catch(() => null);
			if (!res.ok || !json?.success) throw new Error(json?.error || "Something went wrong. Please try again.");
			setResult({ ...json.data, email: form.email, monument });
			setStatus("done");
		} catch (err) {
			setError(err.message);
			setStatus("idle");
		}
	}

	function another() {
		setForm((f) => ({ ...EMPTY, name: f.name, email: f.email, phone: f.phone }));
		setResult(null);
		setStatus("idle");
	}

	return (
		<div className="relative overflow-hidden rounded-3xl border border-rule bg-ink/80 p-6 shadow-[0_40px_120px_-40px_rgba(204,255,0,0.18)] backdrop-blur-xl sm:p-10">
			<AnimatePresence mode="wait" initial={false}>
				{status === "done" && result ? (
					<motion.div
						key="done"
						initial={reduced ? false : { opacity: 0, y: 30, filter: "blur(10px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.8, ease: EASE }}
						className="flex min-h-[520px] flex-col justify-between"
						role="status">
						<div>
							<p className="mb-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
								<span className="h-1.5 w-1.5 rounded-full bg-signal shadow-[0_0_12px_#ccff00]" />
								{result.created ? "Pre-order received" : "Pre-order updated"}
							</p>
							<h3 className="font-montserrat text-4xl font-semibold leading-[0.95] tracking-[-0.03em] text-bone sm:text-5xl">
								You&rsquo;re on
								<span className="block font-instrument-serif font-normal italic text-signal">the grid.</span>
							</h3>
							<p className="mt-6 max-w-md text-base leading-relaxed text-bone/65">
								{result.monument?.name}, {result.monument?.city}. Nothing has been charged.
								{result.created ? ` We have emailed ${result.email}.` : " You had already pre-ordered this monument, so we kept your reference."}
							</p>
						</div>
						<div className="mt-10">
							<p className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bone-muted">Your reference</p>
							<p className="font-mono text-4xl tracking-[0.12em] text-bone sm:text-5xl">
								<DecryptedText text={result.reference} speed={40} />
							</p>
							<button
								type="button"
								onClick={another}
								className="mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted underline decoration-rule underline-offset-8 transition-colors hover:text-signal"
								data-cursor>
								Pre-order another monument
							</button>
						</div>
					</motion.div>
				) : (
					<motion.form
						key="form"
						onSubmit={onSubmit}
						initial={reduced ? false : { opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
						transition={{ duration: 0.6, ease: EASE }}
						className="flex flex-col gap-8"
						noValidate>
						<fieldset>
							<legend className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted">Monument</legend>
							<LayoutGroup>
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{LIVE_MONUMENTS.map((m) => {
										const selected = form.monument === m.slug;
										return (
											<label
												key={m.slug}
												className="relative cursor-pointer rounded-xl border border-rule px-4 py-3.5 transition-colors hover:border-bone/30"
												data-cursor>
												<input
													type="radio"
													name="monument"
													value={m.slug}
													checked={selected}
													onChange={set("monument")}
													className="sr-only"
												/>
												{selected && (
													<motion.span
														layoutId="monument-pick"
														className="absolute inset-0 rounded-xl border border-signal bg-signal/[0.07]"
														transition={{ duration: 0.5, ease: EASE }}
													/>
												)}
												<span className="relative block text-sm font-medium text-bone">{m.name}</span>
												<span className="relative block font-mono text-[10px] uppercase tracking-[0.2em] text-bone-faint">
													{m.city}
												</span>
											</label>
										);
									})}
								</div>
							</LayoutGroup>
						</fieldset>

						<div className="grid gap-6 sm:grid-cols-2">
							<Field id="name" label="Full name" autoComplete="name" required value={form.name} onChange={set("name")} />
							<Field id="email" label="Email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
							<Field id="phone" label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
							<div className="relative">
								<select
									id="visitMonth"
									name="visitMonth"
									value={form.visitMonth}
									onChange={set("visitMonth")}
									className="w-full appearance-none border-b border-rule bg-transparent pb-3 pt-6 text-lg text-bone outline-none transition-colors focus:border-signal">
									<option value="" className="bg-ink">
										Not sure yet
									</option>
									{months.map((mo) => (
										<option key={mo.value} value={mo.value} className="bg-ink">
											{mo.label}
										</option>
									))}
								</select>
								<label htmlFor="visitMonth" className="pointer-events-none absolute left-0 top-0 font-mono text-[11px] uppercase tracking-[0.2em] text-bone-muted">
									When are you visiting?
								</label>
								<span className="pointer-events-none absolute bottom-4 right-0 text-bone-muted" aria-hidden="true">
									↓
								</span>
							</div>
						</div>

						{/* Honeypot: hidden from people, filled by bots. */}
						<div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
							<label htmlFor="website">Website</label>
							<input id="website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
						</div>

						<label className="flex cursor-pointer items-start gap-3 text-sm text-bone/60" data-cursor>
							<input
								type="checkbox"
								checked={form.marketingOk}
								onChange={set("marketingOk")}
								className="mt-0.5 h-4 w-4 shrink-0 accent-[#ccff00]"
							/>
							Also email me when Epocheye opens at new monuments.
						</label>

						<div aria-live="polite" className="min-h-[1.25rem] text-sm text-red-400">
							{error}
						</div>

						<div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
							<p className="max-w-xs text-xs leading-relaxed text-bone-faint">
								Nothing is charged. We use these details only for your pre-order, as set out in our{" "}
								<Link href="/privacy" className="underline underline-offset-4 hover:text-bone">
									privacy policy
								</Link>
								.
							</p>
							<motion.button
								type="submit"
								disabled={status === "sending"}
								whileHover={reduced ? undefined : { scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								transition={{ duration: 0.4, ease: EASE }}
								className="relative inline-flex h-14 min-w-[13rem] items-center justify-center overflow-hidden rounded-full bg-signal px-8 text-sm font-semibold text-ink disabled:cursor-wait"
								data-cursor>
								<AnimatePresence mode="wait" initial={false}>
									{status === "sending" ? (
										<motion.span
											key="sending"
											className="flex items-end gap-1"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											aria-label="Sending">
											{[0, 1, 2, 3, 4].map((b) => (
												<motion.span
													key={b}
													className="block w-1 rounded-sm bg-ink"
													animate={{ height: [6, 20, 6] }}
													transition={{ duration: 0.8, repeat: Infinity, delay: b * 0.1, ease: "easeInOut" }}
												/>
											))}
										</motion.span>
									) : (
										<motion.span key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
											Pre-order →
										</motion.span>
									)}
								</AnimatePresence>
							</motion.button>
						</div>
					</motion.form>
				)}
			</AnimatePresence>
		</div>
	);
}
