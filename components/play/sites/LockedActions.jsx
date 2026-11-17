"use client";

// The buttons on a locked site card: Vote (to /play/vote with this site picked) and the offer to
// play the next site a week early by email. The offer is hidden once the player has given an
// email; a site the server says this player may open early gets a Play early button. One status
// call serves every card on the page. With email switched off (lib/play/features.js) there is no
// offer and no status call; with the weekly vote off there is no Vote button.

import Link from "next/link";
import { useEffect, useState } from "react";
import { emailStatus } from "@/lib/play/community";
import EmailSheet from "@/components/play/EmailSheet";
import { Pill } from "@/components/play/ui";
import "@/components/play/sites/community.css";

let statusCall = null;

function statusOnce() {
	if (!statusCall) statusCall = emailStatus().then((r) => ({ email: r.ok ? r.email : "none", early: r.ok && Array.isArray(r.early) ? r.early : [] }));
	return statusCall;
}

export default function LockedActions({ slug, name, vote = true, email: emailOn = true }) {
	const [email, setEmail] = useState(null); // null until known
	const [early, setEarly] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!emailOn) return undefined;
		let live = true;
		statusOnce().then((s) => {
			if (!live) return;
			setEmail(s.email);
			setEarly(s.early.includes(slug));
		});
		return () => {
			live = false;
		};
	}, [slug, emailOn]);

	const sent = () => {
		statusCall = Promise.resolve({ email: "pending", early: [] });
		setEmail("pending");
	};

	return (
		<>
			{emailOn && early ? (
				<Pill as={Link} strong href={`/play/${encodeURIComponent(slug)}`} aria-label={`Play ${name} early`}>
					Play early
				</Pill>
			) : null}
			{vote ? (
				<Pill as={Link} href={`/play/vote?site=${encodeURIComponent(slug)}`} aria-label={`Vote for ${name} to be built next`}>
					Vote
				</Pill>
			) : null}
			{emailOn && email === "none" ? (
				<button type="button" className="play-site-early" onClick={() => setOpen(true)}>
					Play the next site a week early
				</button>
			) : null}
			{open ? <EmailSheet reason="early" onClose={() => setOpen(false)} onSent={sent} /> : null}
		</>
	);
}
