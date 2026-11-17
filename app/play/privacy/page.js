import Link from "next/link";
import "@/components/play/sites/community.css";

export const metadata = { title: "What Play keeps | Epocheye Play", robots: { index: false, follow: false } };

// /play/privacy  A short summary of what Epocheye Play stores. The full wording is the
// "Epocheye Play" section of /privacy (id="play"). Keep the two in step: if one changes, change both.
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
				<p className="play-page-lead">
					A short summary. The full notice is the{" "}
					<Link href="/privacy#play">Epocheye Play section of our privacy policy</Link>.
				</p>
			</header>
			<section className="play-page-section">
				<ul className="play-email-gets">
					<li>A random id made by your browser and kept in its local storage. No account and no cookie.</li>
					<li>A display name for that id, from a fixed list of made-up names. Leaderboards show only that name.</li>
					<li>Your progress: chapters finished, first picks, your year vote, daily answers and your weekly vote.</li>
					<li>
						Events such as a chapter started or a share, with the page and where you came from. No IP address and no browser
						details are stored. With Do Not Track or Global Privacy Control on, no events are stored.
					</li>
					<li>Your email, only if you give it and tick the box. A request nobody confirms stops working after 14 days.</li>
					<li>Every Play email has a link to stop all Play emails, and to delete your address.</li>
				</ul>
				<p className="play-fine">
					Questions, or a request to delete your Play records: <a href="mailto:support@epocheye.app">support@epocheye.app</a>.
				</p>
			</section>
		</main>
	);
}
