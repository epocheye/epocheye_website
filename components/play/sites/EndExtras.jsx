"use client";

// Added to the end card: the offer to open the next site a week early (by email), and a compact
// board for this site with a link to all the boards. Generic text only: the site name is data.

import Link from "next/link";
import { useEffect, useState } from "react";
import { emailStatus } from "@/lib/play/community";
import EmailSheet from "@/components/play/EmailSheet";
import Leaderboard from "@/components/play/sites/Leaderboard";
import { usePlayFeatures } from "@/components/play/PlayFeatures";
import { Pill } from "@/components/play/ui";
import "@/components/play/sites/community.css";

// Each part follows its switch (lib/play/features.js): no email offer and no status call with
// email off, no board and no link to the boards with the leaderboards off.
export default function EndExtras({ slug }) {
	const features = usePlayFeatures();
	const [email, setEmail] = useState(null); // null until known: "none", "pending" or "confirmed"
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!features.email) return undefined;
		let live = true;
		emailStatus().then((r) => {
			if (live) setEmail(r.ok ? r.email : "none");
		});
		return () => {
			live = false;
		};
	}, [features.email]);

	if (!features.email && !features.leaderboards) return null;
	return (
		<div className="play-end-extra">
			{features.email && email === "none" ? (
				<div className="play-end-early">
					<p>Play the next site a week before everyone else.</p>
					<Pill small onClick={() => setOpen(true)}>
						Leave your email
					</Pill>
				</div>
			) : features.email && email === "pending" ? (
				<p className="play-note">Open the link we emailed you and tap Confirm.</p>
			) : null}
			{features.leaderboards ? (
				<>
					<Leaderboard kind="site" site={slug} title="This site's board" compact empty="This board is not open yet." />
					<p className="play-note">
						<Link href="/play/leaderboards" className="play-site-early">
							All boards
						</Link>
					</p>
				</>
			) : null}
			{open ? <EmailSheet reason="early" onClose={() => setOpen(false)} onSent={() => setEmail("pending")} /> : null}
		</div>
	);
}
