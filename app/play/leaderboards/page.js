import Link from "next/link";
import { liveSites } from "@/lib/play/sites";
import Leaderboard from "@/components/play/sites/Leaderboard";
import PlayOff from "@/components/play/sites/PlayOff";
import { playMeta } from "@/lib/play/meta";
import { playFeatures } from "@/lib/play/features";
import "@/components/play/sites/community.css";

export const metadata = playMeta({
	title: "Leaderboards | Epocheye Play",
	description: "Who rebuilt it best from the evidence, and the longest daily streaks.",
	path: "/play/leaderboards",
});

// /play/leaderboards  Every board on one page: one per live site, and daily streaks. The daily
// board itself lives with the daily puzzle at /play/daily. Display names only, the top 20, never a
// total; a board shows only once it is full enough to say nothing about how many play.
// The streak board and the way to the daily board follow PLAY_DAILY.
export default function PlayLeaderboardsPage() {
	const features = playFeatures();
	if (!features.enabled) return <PlayOff />;
	if (!features.leaderboards) return <PlayOff title="The leaderboards are not available right now" />;
	const sites = liveSites();
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
				<span className="play-label">Leaderboards</span>
			</div>
			<header className="play-page-head">
				<h1>Leaderboards</h1>
				<p className="play-page-lead">Ranked by first picks right, then by time.</p>
			</header>
			{sites.map((s) => (
				<div key={s.slug} className="play-page-section">
					<Leaderboard kind="site" site={s.slug} title={s.name} empty="This board is not open yet." />
				</div>
			))}
			{features.daily ? (
				<>
					<div className="play-page-section">
						<Leaderboard kind="streak" title="Daily streaks" empty="This board is not open yet." />
						<p className="play-fine">Days in a row with the daily puzzle solved, counting today or yesterday.</p>
					</div>
					<div className="play-page-section">
						<span className="play-label">Today</span>
						<p className="play-msg">The daily board is with the daily puzzle.</p>
						<div>
							<Link href="/play/daily" className="play-pill">
								Daily puzzle
							</Link>
						</div>
					</div>
				</>
			) : null}
		</main>
	);
}
