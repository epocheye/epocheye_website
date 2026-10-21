"use client";

import { useEffect, useRef, useState } from "react";

import { MODAL, MONUMENTS, TIERS, VOTE_CARD, tierOrder } from "@/lib/journeys/config";
import { startDodoCheckout } from "@/lib/journeys/checkout";
import { landingParams, trackJourneys } from "./track";
import Button from "./Button";

/**
 * Small <dialog>: monument, tier, email. Saves a reservation intent (no payment) unless
 * checkout is switched on, in which case it hands off to Dodo Payments. In "vote" mode it
 * records a monument suggestion instead.
 */
export default function ReserveModal({ open, onClose, variant, checkoutEnabled }) {
	const ref = useRef(null);
	const [monument, setMonument] = useState(open?.monument || MONUMENTS[0].slug);
	const [tier, setTier] = useState(tierOrder(variant)[0]);
	const [email, setEmail] = useState("");
	const [note, setNote] = useState("");
	const [state, setState] = useState({ status: "idle", error: null });
	const isVote = open?.mode === "vote";

	useEffect(() => {
		const d = ref.current;
		if (!d) return undefined;
		if (open) {
			if (!d.open) d.showModal();
			window.__lenis?.stop();
		} else if (d.open) {
			d.close();
		}
		return () => window.__lenis?.start();
	}, [open]);

	// Reset per opening. (The parent remounts this component with a new key each time.)
	const monumentName = MONUMENTS.find((m) => m.slug === monument)?.name || MONUMENTS[0].name;

	async function submit(e) {
		e.preventDefault();
		if (state.status === "submitting") return;
		setState({ status: "submitting", error: null });
		const kind = isVote ? "vote" : "reserve";
		try {
			if (!isVote && checkoutEnabled) {
				await startDodoCheckout({ monument, tier, email, variant });
				return;
			}
			const res = await fetch("/api/journeys/intent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					kind,
					email,
					monument: isVote ? VOTE_CARD.slug : monument,
					tier: isVote ? null : tier,
					note: isVote ? note : null,
					variant,
					website: e.currentTarget?.website?.value || "",
					...landingParams(),
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong. Please try again.");
			trackJourneys(isVote ? "journeys_vote" : "journeys_reserved", { variant, monument, tier: tier || "" });
			setState({ status: "done", error: null });
		} catch (err) {
			setState({ status: "idle", error: err.message || "Something went wrong. Please try again." });
		}
	}

	return (
		<dialog
			ref={ref}
			className="jr-modal"
			aria-labelledby="jr-modal-title"
			onClose={onClose}
			onClick={(e) => {
				if (e.target === ref.current) onClose();
			}}
		>
			<div className="jr-modal__panel" style={{ position: "relative" }}>
				<button type="button" className="jr-modal__close" onClick={onClose} aria-label="Close">
					×
				</button>
				<h2 id="jr-modal-title" className="jr-modal__title">
					{isVote ? MODAL.voteTitle : MODAL.title}
				</h2>

				{state.status === "done" ? (
					<p className="jr-body">{isVote ? MODAL.voteSuccess : MODAL.success(monumentName)}</p>
				) : (
					<form onSubmit={submit} className="jr-field" style={{ gap: "1.25rem" }}>
						{isVote ? (
							<div className="jr-field">
								<label htmlFor="jr-vote">{MODAL.voteField}</label>
								<input
									id="jr-vote"
									className="jr-input"
									value={note}
									onChange={(e) => setNote(e.target.value)}
									maxLength={200}
									required
									placeholder="Monument and city"
								/>
							</div>
						) : (
							<>
								<div className="jr-field">
									<label htmlFor="jr-monument">{MODAL.monument}</label>
									<select id="jr-monument" className="jr-input jr-select" value={monument} onChange={(e) => setMonument(e.target.value)}>
										{MONUMENTS.map((m) => (
											<option key={m.slug} value={m.slug}>
												{m.name}, {m.city}
											</option>
										))}
									</select>
								</div>
								<div className="jr-field">
									<label htmlFor="jr-tier">{MODAL.tier}</label>
									<select id="jr-tier" className="jr-input jr-select" value={tier} onChange={(e) => setTier(e.target.value)}>
										{tierOrder(variant).map((id) => (
											<option key={id} value={id}>
												{TIERS[id].name}, founding price {TIERS[id].founding}
											</option>
										))}
									</select>
								</div>
							</>
						)}
						<div className="jr-field">
							<label htmlFor="jr-email">{MODAL.email}</label>
							<input
								id="jr-email"
								className="jr-input"
								type="email"
								inputMode="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								placeholder="you@example.com"
							/>
						</div>
						<div className="jr-honeypot" aria-hidden="true">
							<label htmlFor="jr-website">Website</label>
							<input id="jr-website" name="website" tabIndex={-1} autoComplete="off" />
						</div>
						{!isVote ? <p className="jr-small">{MODAL.consent}</p> : null}
						{state.error ? (
							<p className="jr-error" role="alert">
								{state.error}
							</p>
						) : null}
						<div>
							<Button type="submit" disabled={state.status === "submitting"}>
								{state.status === "submitting" ? MODAL.submitting : isVote ? MODAL.voteSubmit : MODAL.submit}
							</Button>
						</div>
					</form>
				)}
			</div>
		</dialog>
	);
}
