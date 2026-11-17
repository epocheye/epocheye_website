// The "What you now know" card. Shown at the end of a level and on its own shareable page.
// No hooks and no browser calls, so the server can render it. Every fact, choice and unknown on
// it comes from the pack's story (lib/play/card.js cardView). The headings are generic.

export default function KnowCard({ view, lead = null, headingLevel = 2 }) {
	const H = `h${headingLevel}`;
	const Sub = `h${headingLevel + 1}`;
	const choices = view.choices || [];
	return (
		<article className="play-know">
			<header className="play-know-head">
				<span className="play-label">{[view.siteName, view.place].filter(Boolean).join(" · ")}</span>
				{lead ? <p className="play-know-lead">{lead}</p> : null}
				<H className="play-know-title">What you now know</H>
			</header>
			<ol className="play-know-list">
				{view.know.map((text, i) => (
					<li key={i}>
						<span className="play-know-n" aria-hidden="true">{i + 1}</span>
						<span>{text}</span>
					</li>
				))}
			</ol>
			{choices.length || view.vote ? (
				<section className="play-know-part">
					<Sub className="play-know-sub">Your choices</Sub>
					<ul className="play-know-plain">
						{choices.map((c) => (
							<li key={c.id}>{c.record}</li>
						))}
						{view.vote ? (
							<li>
								<span className="play-know-q">{view.vote.question}</span> {view.vote.pick}
							</li>
						) : null}
					</ul>
				</section>
			) : null}
			{view.unknown.length ? (
				<section className="play-know-part">
					<Sub className="play-know-sub">What nobody knows</Sub>
					<ul className="play-know-plain is-unknown">
						{view.unknown.map((text, i) => (
							<li key={i}>{text}</li>
						))}
					</ul>
				</section>
			) : null}
		</article>
	);
}
