"use client";

// The end of the open world's story: the existing "What you now know" card, with its share button
// and the year vote's shares, and one way on. Loaded on demand. With no server it still shows.

import EndScreen, { endView } from "@/components/play/EndScreen";
import { voteOptionsOf } from "@/components/play/YearVoteShares";

export default function WorldEnding({ slug, version, site, state, onContinue }) {
	const story = site.story;
	const lens = story.default_lens || "traveller";
	const game = { choices: state.choices, vote: state.vote };
	const view = endView(site, lens, game);
	return (
		<div className="w-ending">
			{view ? <EndScreen slug={slug} version={version} view={view} game={game} voteOptions={view.vote ? voteOptionsOf(story, lens, lens) : []} /> : null}
			<button type="button" className="w-btn is-hot w-ending-go" onClick={onContinue}>Finish the story</button>
		</div>
	);
}
