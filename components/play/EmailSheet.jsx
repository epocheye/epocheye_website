"use client";

// The one place Play asks for an email (brief 5.4 and 5.5). Asked only to vote, or to open the
// next site a week early. The link it sends also carries the player's name, votes and daily
// streak to another device (not their place in a level, which stays with each device). One field, a consent box that starts
// unticked, a link to the privacy notice, and a plain list of what the player gets. Nothing is
// sent without the box ticked, here or on the server.

import Link from "next/link";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { giveEmail } from "@/lib/play/community";
import { Pill, Sheet } from "@/components/play/ui";
import "@/components/play/sites/community.css";

const LEADS = {
	vote: "Your vote needs an email.",
	early: "Play the next site a week early.",
};

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The sheet is drawn at the top of the Play page, so nothing it is opened from (the end card, a
// card on a list) can sit above it or clip it. It is only ever opened by a tap, never on the server.
export default function EmailSheet(props) {
	const root = document.querySelector(".play") || document.body;
	return createPortal(<EmailSheetBody {...props} />, root);
}

// reason: "vote" or "early". onSent runs once the server has taken the address.
function EmailSheetBody({ reason = "early", onClose, onSent }) {
	const id = useId();
	const [email, setEmail] = useState("");
	const [consent, setConsent] = useState(false);
	const [state, setState] = useState({ step: "form", error: "" });

	const submit = async (e) => {
		e.preventDefault();
		if (state.step === "sending") return;
		const value = email.trim();
		if (!SIMPLE_EMAIL.test(value)) {
			setState({ step: "form", error: "That does not look like an email address." });
			return;
		}
		if (!consent) {
			setState({ step: "form", error: "Tick the box first. Without it we cannot send anything." });
			return;
		}
		setState({ step: "sending", error: "" });
		const r = await giveEmail(value, consent, reason);
		if (r.ok) {
			setState({ step: "sent", error: "" });
			onSent?.();
			return;
		}
		const error =
			r.status === 429
				? "Too many tries. Wait a few minutes and try again."
				: r.error === "bad_email"
					? "That does not look like an email address."
					: r.error === "consent_required"
						? "Tick the box first. Without it we cannot send anything."
						: r.status === 503
							? "Email is not available right now. Try again later."
							: "That did not go through. Try again.";
		setState({ step: "form", error });
	};

	if (state.step === "sent") {
		return (
			<Sheet title="Check your inbox" onClose={onClose}>
				<p className="play-sheet-lead">We sent you a link.</p>
				<p className="play-msg">Open it and tap Confirm. The same link can carry your name, votes and streak to another device.</p>
				<p className="play-fine">If it does not arrive in a few minutes, look in your spam folder.</p>
				<div>
					<Pill strong onClick={onClose}>
						Done
					</Pill>
				</div>
			</Sheet>
		);
	}

	return (
		<Sheet title="Leave your email" onClose={onClose}>
			<form className="play-email-form" onSubmit={submit} noValidate>
				<p className="play-sheet-lead">{LEADS[reason] || LEADS.early}</p>
				<div>
					<p className="play-sheet-sub">What you get</p>
				</div>
				<ul className="play-email-gets">
					<li>The next site opens for you a week before everyone else.</li>
					<li>Your vote for the next site counts.</li>
					<li>A link that carries your Play name, votes and daily streak to another phone or computer.</li>
				</ul>
				<div className="play-field">
					<label htmlFor={`${id}-email`}>Email</label>
					<input
						id={`${id}-email`}
						className="play-input"
						type="email"
						inputMode="email"
						autoComplete="email"
						autoCapitalize="none"
						spellCheck={false}
						maxLength={254}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						aria-describedby={`${id}-msg`}
					/>
				</div>
				<label className="play-consent">
					<input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
					<span>
						I agree that Epocheye may email me about Play. Read the{" "}
						<Link href="/privacy" target="_blank" rel="noopener">
							privacy notice
						</Link>{" "}
						and{" "}
						<Link href="/play/privacy" target="_blank" rel="noopener">
							what Play keeps
						</Link>
						.
					</span>
				</label>
				<p className="play-fine">We send one email now, to confirm it is you. Every email has a link to stop them.</p>
				<p id={`${id}-msg`} className="play-msg is-error" role="alert">
					{state.error}
				</p>
				<div>
					<Pill strong type="submit" disabled={state.step === "sending"}>
						{state.step === "sending" ? "Sending" : "Send the link"}
					</Pill>
				</div>
			</form>
		</Sheet>
	);
}
