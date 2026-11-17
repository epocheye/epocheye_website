import Link from "next/link";
import "@/components/play/sites/community.css";

export const metadata = { title: "What Play keeps | Epocheye Play", robots: { index: false, follow: false } };

// /play/privacy  A plain list of what Epocheye Play stores, written from the code (lib/server/play/*
// and db/015_play.sql). The legal notice is /privacy; the owner's wording for Play belongs there.
export default function PlayPrivacyPage() {
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
				<span className="play-label">Privacy</span>
			</div>
			<header className="play-page-head">
				<h1>What Play keeps</h1>
				<p className="play-page-lead">[SAMBIT: privacy wording for Play, to go into the privacy notice at /privacy before launch.]</p>
			</header>
			<section className="play-page-section">
				<ul className="play-email-gets">
					<li>A random id made by your browser and kept in its local storage. No account and no cookie.</li>
					<li>A display name picked for that id from a fixed list of made-up names. Leaderboards show only that name.</li>
					<li>Your progress records: chapters finished, first picks, your year vote, daily answers and your weekly vote.</li>
					<li>Events such as a chapter started or a share, with the page and where you came from. No IP address and no browser details are stored. With Do Not Track or Global Privacy Control on, no events are stored.</li>
					<li>Your email, only if you give it and tick the box. Until you confirm it, it is kept as a request, which stops working after 14 days and is then cleared out.</li>
					<li>Every email has a link to stop all Play emails, and to delete your address.</li>
				</ul>
				<p className="play-fine">
					The privacy notice for Epocheye is at <Link href="/privacy">/privacy</Link>.
				</p>
			</section>
		</main>
	);
}
