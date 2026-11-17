"use client";

// A site that opens within a week (lib/play/sites.js earlySite) plays early only for a player with
// a confirmed email (brief 5.5). The server says which sites this player may open early; the
// level loads only then. Everyone else sees the offer.

import Link from "next/link";
import { useEffect, useState } from "react";
import { emailStatus } from "@/lib/play/community";
import EmailSheet from "@/components/play/EmailSheet";
import { Pill } from "@/components/play/ui";
import "@/components/play/sites/community.css";

export default function EarlyGate({ slug, name, children }) {
	const [state, setState] = useState({ loaded: false, early: false, email: "none" });
	const [sheet, setSheet] = useState(false);

	useEffect(() => {
		let live = true;
		emailStatus().then((r) => {
			if (live) setState({ loaded: true, early: r.ok && Array.isArray(r.early) && r.early.includes(slug), email: r.ok ? r.email : "none" });
		});
		return () => {
			live = false;
		};
	}, [slug]);

	if (state.early) return children;

	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
			</div>
			<header className="play-page-head">
				<h1>{name}</h1>
				<p className="play-page-lead">{state.loaded ? "This site is not open yet. Players with a confirmed email can play it a week early." : "Checking."}</p>
			</header>
			{state.loaded ? (
				<section className="play-page-section">
					{state.email === "pending" ? <p className="play-msg">Open the link we emailed you and tap Confirm, then come back here.</p> : null}
					<div className="play-vote-actions">
						{state.email !== "confirmed" ? (
							<Pill strong onClick={() => setSheet(true)}>
								Leave your email
							</Pill>
						) : null}
						<Link href="/play" className="play-pill">
							All sites
						</Link>
					</div>
				</section>
			) : null}
			{sheet ? <EmailSheet reason="early" onClose={() => setSheet(false)} onSent={() => setState((s) => ({ ...s, email: "pending" }))} /> : null}
		</main>
	);
}
