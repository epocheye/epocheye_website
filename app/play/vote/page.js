import Link from "next/link";
import { LOCKED_LABELS, lockedSites } from "@/lib/play/sites";
import WeeklyVote from "@/components/play/sites/WeeklyVote";
import "@/components/play/sites/community.css";

export const metadata = { title: "Vote for the next site | Epocheye Play" };

// /play/vote             the weekly vote: which locked site gets built next
// /play/vote?site=<slug> the same, with that site picked (from a locked card's Vote button)
export default async function PlayVotePage({ searchParams }) {
	const query = await searchParams;
	const sites = lockedSites().map((s) => ({ slug: s.slug, name: s.name, place: s.place, label: LOCKED_LABELS[s.status] }));
	const picked = typeof query.site === "string" && sites.some((s) => s.slug === query.site) ? query.site : null;
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
				<span className="play-label">Weekly vote</span>
			</div>
			<header className="play-page-head">
				<span className="play-label">This week</span>
				<h1>Which site gets built next?</h1>
				<p className="play-page-lead">Pick one. You can change your vote until the week ends.</p>
			</header>
			<WeeklyVote sites={sites} picked={picked} />
		</main>
	);
}
