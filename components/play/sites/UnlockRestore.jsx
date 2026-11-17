"use client";

// The page behind a Play email link. Reads the token from the address (the fragment, or an older
// ?t= link), takes it out of the address bar at once, then asks for two separate taps: confirm the
// address, then, if the player wants, play as that player on this device. Nothing happens on a
// visit alone.

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { confirmLink, restoreFromLink } from "@/lib/play/community";
import { Pill } from "@/components/play/ui";

// The token from #t=... or ?t=..., and the address bar cleaned of it.
function takeToken() {
	try {
		const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
		const query = new URLSearchParams(window.location.search);
		const t = hash.get("t") || query.get("t") || "";
		if (t || window.location.hash || window.location.search) window.history.replaceState(null, "", window.location.pathname);
		return t.length <= 600 ? t : "";
	} catch {
		return "";
	}
}

function Head({ title }) {
	return (
		<header className="play-page-head">
			<h1>{title}</h1>
		</header>
	);
}

export default function UnlockRestore() {
	// step: read, ask, confirming, confirmed, moving, moved, moved-failed, bad, taken, busy
	const [s, setS] = useState({ step: "read", t: "", name: "" });

	useEffect(() => {
		const t = takeToken();
		startTransition(() => setS({ step: t ? "ask" : "bad", t, name: "" }));
	}, []);

	const confirm = async () => {
		if (s.step !== "ask") return;
		setS((x) => ({ ...x, step: "confirming" }));
		const r = await confirmLink(s.t);
		if (r.ok) setS((x) => ({ ...x, step: "confirmed", name: r.name || "" }));
		else setS((x) => ({ ...x, step: r.error === "taken" ? "taken" : r.status === 429 ? "busy" : "bad" }));
	};

	const move = async () => {
		if (s.step !== "confirmed") return;
		setS((x) => ({ ...x, step: "moving" }));
		const r = await restoreFromLink(s.t);
		setS((x) => ({ ...x, step: r.ok ? "moved" : "moved-failed" }));
	};

	const links = (
		<div className="play-vote-actions">
			<Link href="/play" className="play-pill">
				Go to Play
			</Link>
			<Link href="/play/vote" className="play-pill">
				Vote for the next site
			</Link>
		</div>
	);

	if (s.step === "read") return <Head title="Your Epocheye Play link" />;

	if (s.step === "bad" || s.step === "taken" || s.step === "busy") {
		const text =
			s.step === "taken"
				? "Another game confirmed this address first. Open the latest link we sent to that address."
				: s.step === "busy"
					? "Too many tries. Wait a few minutes, then open the link again."
					: "It may be old, or a newer link replaced it. Only the latest link we sent works.";
		return (
			<>
				<Head title={s.step === "busy" ? "Too many tries" : "This link does not work"} />
				<section className="play-page-section">
					<p className="play-msg">{text}</p>
					{links}
				</section>
			</>
		);
	}

	if (s.step === "ask" || s.step === "confirming") {
		return (
			<>
				<Head title="Confirm your email" />
				<section className="play-page-section">
					<p className="play-msg">Tap below to confirm this address for Epocheye Play.</p>
					<div className="play-vote-actions">
						<Pill strong onClick={confirm} disabled={s.step === "confirming"}>
							{s.step === "confirming" ? "Confirming" : "Confirm my email"}
						</Pill>
					</div>
				</section>
			</>
		);
	}

	return (
		<>
			<Head title="Your email is confirmed" />
			<section className="play-page-section">
				<p className="play-msg">
					{`Thank you${s.name ? `, ${s.name}` : ""}. Your vote for the next site now counts, and when a new site opens you can play it a week early.`}
				</p>
				{s.step === "moved" ? (
					<p className="play-msg" role="status">
						{`This device now plays as ${s.name}.`}
					</p>
				) : s.step === "moved-failed" ? (
					<p className="play-msg is-error" role="alert">
						That did not work. Each link moves a player once. Ask for a new link from the game.
					</p>
				) : (
					<>
						<p className="play-msg">On another phone or computer? Tap below there to carry your name, your votes and your daily streak across.</p>
						<p className="play-fine">{`This replaces the Play name on this device with ${s.name || "yours"}. Your place in a level stays with each device. The link works for this once.`}</p>
						<div className="play-vote-actions">
							<Pill onClick={move} disabled={s.step === "moving"}>
								{s.step === "moving" ? "Moving" : `Play as ${s.name || "me"} on this device`}
							</Pill>
						</div>
					</>
				)}
				{links}
			</section>
		</>
	);
}
