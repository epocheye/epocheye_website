import Link from "next/link";
import DailyGame from "@/components/play/daily/DailyGame";
import { publicDaily } from "@/lib/server/play/daily";
import "@/components/play/sites/community.css";
import "@/components/play/daily/daily.css";

export const metadata = {
	title: "The Missing Piece | Epocheye Play",
	description: "One lost piece a day. Three clues from the evidence, then where it belongs.",
};

// The puzzle changes at midnight UTC, so the page is built per request (it is one small lookup).
export const dynamic = "force-dynamic";

// /play/daily   The Missing Piece (brief 1.4). Today's puzzle, without answers, is rendered here so
// the first clue shows with no wait; the page then asks the server whether this player has played.
export default function PlayDailyPage() {
	const initial = publicDaily();
	return (
		<main className="play-page play-daily">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
				<span className="play-label">Daily</span>
			</div>
			<DailyGame key={initial ? `${initial.day}|${initial.puzzle.id}` : "none"} initial={initial} />
		</main>
	);
}
