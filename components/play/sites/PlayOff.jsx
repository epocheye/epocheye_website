import Link from "next/link";
import "@/components/play/sites/community.css";

// What a switched-off part of Play shows instead (lib/play/features.js). Plain, with no game
// code and no calls to the Play API.
//
// <PlayOff />                  the whole game is off: "Coming soon", with a way back to the site
// <PlayOff title="The daily puzzle is not available right now" />   one feature is off: a calm
//                              "not available", back to /play

export default function PlayOff({ title = null }) {
	if (!title) {
		return (
			<main className="play-page">
				<div className="play-home-bar">
					<Link href="/" className="play-brand" prefetch={false}>
						Epocheye
					</Link>
				</div>
				<header className="play-page-head">
					<span className="play-label">Epocheye Play</span>
					<h1>Coming soon</h1>
					<p className="play-page-lead">A history game where you rebuild a lost monument from its evidence.</p>
				</header>
				<section className="play-page-section">
					<div>
						<Link href="/" className="play-pill" prefetch={false}>
							Back to Epocheye
						</Link>
					</div>
				</section>
			</main>
		);
	}
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand" prefetch={false}>
					Epocheye Play
				</Link>
			</div>
			<header className="play-page-head">
				<h1>{title}</h1>
				<p className="play-page-lead">The game itself is open. Pick a site to play.</p>
			</header>
			<section className="play-page-section">
				<div>
					<Link href="/play" className="play-pill" prefetch={false}>
						All sites
					</Link>
				</div>
			</section>
		</main>
	);
}
