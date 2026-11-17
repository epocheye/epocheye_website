import Link from "next/link";
import { readCard } from "@/lib/play/card.server";
import KnowCard from "@/components/play/KnowCard";

// /play/c/<id>   a player's "What you now know" card. Public and shareable, with its own share
// image (opengraph-image.js). Until the Phase 3 database exists the id is the card itself:
// base64url JSON of ids only (lib/play/card.js). The words all come from the pack's story.

const NO_INDEX = { index: false, follow: false }; // until launch

export async function generateMetadata({ params }) {
	const { id } = await params;
	const card = await readCard(id);
	if (!card) return { title: "Card | Epocheye Play", robots: NO_INDEX };
	const { view } = card;
	const title = `${view.title || view.siteName} | Epocheye Play`;
	const description = view.shareLine || `${view.know.length} things learned at ${view.siteName}.`;
	return {
		title,
		description,
		robots: NO_INDEX,
		openGraph: { title, description, type: "article" },
		twitter: { card: "summary_large_image", title, description },
	};
}

export default async function PlayCardPage({ params }) {
	const { id } = await params;
	const card = await readCard(id);
	return (
		<main className="play-cardpage">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
				<span className="play-label">A history game</span>
			</div>
			{card ? (
				<>
					<KnowCard view={card.view} lead={card.view.shareLine} headingLevel={1} />
					<div className="play-cardpage-actions">
						<Link className="play-pill is-strong" href={`/play/${card.slug}`}>
							Play it yourself
						</Link>
						<Link className="play-pill" href="/download">
							See it for real
						</Link>
					</div>
				</>
			) : (
				<div className="play-cardpage-plain">
					<h1>This card could not be read</h1>
					<p>The link may have been cut short, or it is out of date.</p>
					<Link className="play-pill" href="/play">
						All sites
					</Link>
				</div>
			)}
		</main>
	);
}
