"use client";

// Live shares for the year vote, once the player has voted. The server answers only when there
// are enough votes that a share says nothing about how many people voted; until then this shows
// nothing at all. No count is ever shown. Option wording comes from the pack's story.

import { useEffect, useState } from "react";
import { textFor } from "@/lib/play/story/engine";
import { yearVoteShares } from "@/lib/play/api";

// The options of a story's vote beat, as { id, text }, or [] when it has none.
export function voteOptionsOf(story, lens, fallback) {
	const all = [...(story?.chapters || []).flatMap((c) => c.beats || []), ...(story?.ending?.beats || [])];
	const beat = all.find((b) => b.type === "vote");
	return (beat?.options || []).map((o) => ({ id: o.id, text: textFor(o.text, lens, fallback) }));
}

export default function YearVoteShares({ slug, options, vote }) {
	const [result, setResult] = useState({ key: "", shares: null });
	const key = `${slug}|${vote || ""}`;

	useEffect(() => {
		if (!vote) return undefined;
		let live = true;
		yearVoteShares(slug).then((r) => {
			if (live && r.ok && r.enough && Array.isArray(r.shares)) setResult({ key, shares: r.shares });
		});
		return () => {
			live = false;
		};
	}, [slug, vote, key]);

	if (!vote || result.key !== key || !result.shares) return null;
	const pct = new Map(result.shares.map((x) => [x.id, x.pct]));
	const rows = options.filter((o) => pct.has(o.id));
	if (!rows.length) return null;
	return (
		<section className="play-shares" aria-label="How players voted">
			<span className="play-label">How players voted</span>
			<ul className="play-shares-list">
				{rows.map((o) => {
					const p = pct.get(o.id);
					const mine = o.id === vote;
					return (
						<li key={o.id} className={mine ? "is-mine" : undefined}>
							<span className="play-shares-row">
								<span className="play-shares-name">
									{o.text}
									{mine ? <span className="play-sr"> (your pick)</span> : null}
								</span>
								<span className="play-shares-pct">{`${p}%`}</span>
							</span>
							<span className="play-shares-bar" aria-hidden="true">
								<span style={{ width: `${p}%` }} />
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
