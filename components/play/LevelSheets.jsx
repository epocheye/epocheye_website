"use client";

// The sheets a level can open: chapters, credits, sources, the side note, the evidence list
// and the debug view. Generic interface text only.

import Link from "next/link";
import { useState } from "react";
import { currentStep, debugBeats, textFor } from "@/lib/play/story/engine";
import { nodeById } from "@/lib/play/pack";
import { Icon, Pill, Sheet, TierChip } from "@/components/play/ui";
import { factsOf } from "@/components/play/StoryPanel";

function chapterLabel(c) {
	if (c.preview) return "Preview";
	if (c.n === 0) return "Prologue";
	return `Chapter ${c.n ?? c.index}`;
}

export function ChaptersSheet({ site, chapters, state, dispatch, onClose }) {
	const g = state.game;
	const story = site.story;
	const row = (c) => {
		const done = g.chaptersDone.includes(c.id);
		const current = c.index === g.chapter && state.screen === "play";
		return (
			<li key={c.id}>
				<button
					type="button"
					className={`play-list-row${current ? " is-current" : ""}`}
					aria-current={current ? "step" : undefined}
					onClick={() => {
						dispatch({ type: "jump", chapter: c.index });
						onClose();
					}}
				>
					<span className="play-list-kicker">{chapterLabel(c)}</span>
					<span className="play-list-title">{c.title}</span>
					<span className="play-list-sub">{c.years}</span>
					<span className="play-list-state">{done ? <><Icon name="check" size={14} /><span className="play-sr">Finished</span></> : null}</span>
				</button>
			</li>
		);
	};
	const main = chapters.filter((c) => !c.preview);
	const previews = chapters.filter((c) => c.preview);
	// With every chapter finished, the card at the end can be opened again from here.
	const hasCard = !!story.ending?.know?.length && main.every((c) => g.chaptersDone.includes(c.id));
	const atCard = state.screen === "done";
	// Every way to move is also here, so no drag is ever needed to find a marker.
	const here = nodeById(site, state.view.node);
	const links = (here?.links || []).map((id) => nodeById(site, id)).filter(Boolean);
	return (
		<Sheet title="Chapters" onClose={onClose}>
			<p className="play-sheet-lead">{story.title}</p>
			<ul className="play-list">
				{main.map(row)}
				{hasCard ? (
					<li>
						<button
							type="button"
							className={`play-list-row${atCard ? " is-current" : ""}`}
							aria-current={atCard ? "step" : undefined}
							onClick={() => {
								dispatch({ type: "end" });
								onClose();
							}}
						>
							<span className="play-list-kicker">The end</span>
							<span className="play-list-title">What you now know</span>
						</button>
					</li>
				) : null}
			</ul>
			{previews.length ? (
				<>
					<h3 className="play-sheet-sub">Preview</h3>
					<ul className="play-list">{previews.map(row)}</ul>
				</>
			) : null}
			{story.lenses?.length ? (
				<>
					<h3 className="play-sheet-sub">How it is told</h3>
					<div className="play-options is-grid" role="group" aria-label="How the story is told">
						{story.lenses.map((l) => (
							<button
								key={l.id}
								type="button"
								className={`play-option${(g.lens || story.default_lens) === l.id ? " is-current" : ""}`}
								aria-pressed={(g.lens || story.default_lens) === l.id}
								onClick={() => dispatch({ type: "lens", lens: l.id })}
							>
								<span className="play-option-name">{l.name}</span>
								<span className="play-option-blurb">{l.blurb}</span>
							</button>
						))}
					</div>
				</>
			) : null}
			{links.length ? (
				<>
					<h3 className="play-sheet-sub">{`From ${here.name}`}</h3>
					<div className="play-actions is-left">
						{links.map((n) => (
							<Pill
								key={n.id}
								small
								onClick={() => {
									dispatch({ type: "go", node: n.id });
									onClose();
								}}
							>
								{`Go to ${n.name}`}
							</Pill>
						))}
					</div>
				</>
			) : null}
			<div className="play-actions is-left">
				<Pill as={Link} href="/play" small>
					All sites
				</Pill>
			</div>
		</Sheet>
	);
}

export function CreditsSheet({ site, onClose }) {
	return (
		<Sheet title="Credits" onClose={onClose}>
			<p className="play-sheet-lead">{site.site.name}</p>
			<ul className="play-credits">
				{(site.credits || []).map((c) => (
					<li key={c}>{c}</li>
				))}
			</ul>
		</Sheet>
	);
}

export function SourcesSheet({ site, beat, onClose }) {
	const story = site.story;
	const facts = factsOf(story, beat);
	const item = beat?.evidence ? (story.evidence || []).find((e) => e.id === beat.evidence) : null;
	return (
		<Sheet title="Where this comes from" onClose={onClose}>
			<ul className="play-sources">
				{facts.map((f) => (
					<li key={f.id}>
						<TierChip tier={f.tier} tiers={story.tiers} />
						<p>{f.source}</p>
					</li>
				))}
				{item?.credit ? (
					<li>
						<p>{item.credit}</p>
					</li>
				) : null}
			</ul>
			{facts.length === 0 && !item?.credit ? <p className="play-ui-text">No source is listed for this line.</p> : null}
		</Sheet>
	);
}

export function NoteSheet({ site, chapter, lens, onClose }) {
	const story = site.story;
	const note = chapter?.side_notes?.[lens];
	const lensName = (story.lenses || []).find((l) => l.id === lens)?.name;
	if (!note) return null;
	return (
		<Sheet title={lensName ? `Side note: ${lensName}` : "Side note"} onClose={onClose}>
			<p className="play-line is-line">{textFor(note.text, lens, story.default_lens)}</p>
			<ul className="play-sources">
				{factsOf(story, note).map((f) => (
					<li key={f.id}>
						<TierChip tier={f.tier} tiers={story.tiers} />
						<p>{f.source}</p>
					</li>
				))}
			</ul>
		</Sheet>
	);
}

// The tap-only path through a Look step: every piece of evidence, wherever it is.
export function EvidenceSheet({ site, chapters, state, dispatch, onClose }) {
	const story = site.story;
	const step = currentStep(state.game, chapters);
	if (step?.kind !== "look") return null;
	return (
		<Sheet title="Evidence" onClose={onClose}>
			<ul className="play-list">
				{step.beats.map((b) => {
					const item = (story.evidence || []).find((e) => e.id === b.evidence);
					const done = state.game.found.includes(b.id);
					// Evidence set at a viewpoint this pack does not have is a card: it opens from anywhere.
					const at = b.at && nodeById(site, b.at.node) ? b.at : null;
					const away = at && at.node !== state.view.node;
					const where = at ? nodeById(site, at.node).name : "A card";
					return (
						<li key={b.id}>
							<button
								type="button"
								className="play-list-row"
								onClick={() => {
									if (away) dispatch({ type: "go", node: at.node, target: at.target });
									else {
										if (at) dispatch({ type: "aim", target: at.target });
										dispatch({ type: "find", id: b.id });
									}
									onClose();
								}}
							>
								<span className="play-list-kicker">{away ? `Go to ${where}` : where}</span>
								<span className="play-list-title">{item?.title || "Evidence"}</span>
								<span className="play-list-state">{done ? <><Icon name="check" size={14} /><span className="play-sr">Found</span></> : null}</span>
							</button>
						</li>
					);
				})}
			</ul>
		</Sheet>
	);
}

// The test of the level (brief 8.10): questions drawn from the card. Debug view only, never shown
// to players. Marks and the score appear once every question has an answer.
function Quiz({ items, lens, fallbackLens }) {
	const [answers, setAnswers] = useState({});
	const say = (value) => textFor(value, lens, fallbackLens);
	const answered = items.filter((q) => answers[q.id] != null).length;
	const all = answered === items.length;
	const score = items.filter((q) => answers[q.id] === q.answer).length;
	return (
		<div className="play-quiz">
			<p className="play-quiz-score" role="status" aria-live="polite">
				{all ? `Score: ${score} of ${items.length}` : `Answered ${answered} of ${items.length}. The score shows when all are answered.`}
			</p>
			<ol className="play-quiz-list">
				{items.map((q) => {
					const mine = answers[q.id];
					return (
						<li key={q.id}>
							<p className="play-quiz-q">{say(q.q)}</p>
							<div className="play-options" role="group" aria-label={say(q.q)}>
								{(q.options || []).map((option, i) => {
									const on = mine === i;
									const mark = all ? (i === q.answer ? "Right answer" : on ? "Wrong" : "") : on ? "Picked" : "";
									return (
										<button
											key={i}
											type="button"
											className={`play-option is-row is-quiz${on ? " is-current" : ""}`}
											aria-pressed={on}
											disabled={all}
											onClick={() => setAnswers({ ...answers, [q.id]: i })}
										>
											<span className="play-option-id" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
											<span>{say(option)}</span>
											{mark ? <span className="play-tag">{mark}</span> : null}
										</button>
									);
								})}
							</div>
							<p className="play-dim">{`From card item ${q.item}`}</p>
						</li>
					);
				})}
			</ol>
			<div className="play-actions is-left">
				<Pill small onClick={() => setAnswers({})}>
					Start the test again
				</Pill>
			</div>
		</div>
	);
}

// What the story asks for that this pack does not have. The level copes with each of these;
// this is where it says so.
function packGaps(site, chapters) {
	const out = [];
	const has = (id) => !!nodeById(site, id);
	const restorations = new Set((site.restorations || []).map((r) => r.id));
	for (const c of chapters) {
		if (c.start_node && !has(c.start_node)) out.push(`${c.id}: start viewpoint "${c.start_node}" is not in this pack. The chapter stays on the viewpoint the player is on.`);
		for (const st of c.steps) {
			for (const b of st.beats || []) {
				if (b.at?.node && !has(b.at.node)) out.push(`${c.id} ${b.id}: evidence viewpoint "${b.at.node}" is not in this pack. It is offered as a card.`);
			}
			if (st.kind === "restore" && !restorations.has(st.beat.restoration)) out.push(`${c.id} ${st.beat.id}: restoration "${st.beat.restoration}" is not in this pack. A placeholder piece is shown.`);
		}
	}
	return out;
}

export function DebugSheet({ site, chapters, state, dispatch, onClose }) {
	const g = state.game;
	const step = currentStep(g, chapters);
	const story = site.story;
	const rows = debugBeats(story);
	const gaps = packGaps(site, chapters);
	const quiz = story.ending?.quiz || [];
	const last = chapters[chapters.length - 1];
	const snapshot = {
		chapter: chapters[g.chapter]?.id, step: g.step, kind: step?.kind, stepId: step?.id, lens: g.lens, node: state.view.node,
		found: g.found, picked: g.picked, afterIndex: g.afterIndex, placed: g.placed, pressed: g.pressed, choices: g.choices, vote: g.vote,
		restored: g.restored, revealed: g.revealed, chaptersDone: g.chaptersDone, complete: g.complete, proof: g.proof, proofSeen: g.proofSeen,
		revealAll: state.debugAll, fullReveal: state.full, screen: state.screen, missingStartNode: state.missing,
	};
	return (
		<Sheet title="Debug" onClose={onClose} wide>
			<div className="play-actions is-left">
				{chapters.map((c) => (
					<Pill key={c.id} small strong={c.index === g.chapter && state.screen === "play"} onClick={() => dispatch({ type: "jump", chapter: c.index })}>
						{`Jump: ${c.id}`}
					</Pill>
				))}
				{last?.endingAt != null ? (
					<Pill small onClick={() => dispatch({ type: "jump", chapter: last.index, step: last.endingAt })}>
						Jump: ending beats
					</Pill>
				) : null}
				<Pill
					small
					strong={state.screen === "done"}
					onClick={() => {
						dispatch({ type: "end", force: true });
						onClose();
					}}
				>
					Jump to ending
				</Pill>
			</div>
			<div className="play-actions is-left">
				<Pill small aria-pressed={state.debugAll} strong={state.debugAll} onClick={() => dispatch({ type: "revealAll", on: !state.debugAll })}>
					{state.debugAll ? "Reveal all: on" : "Reveal all: off"}
				</Pill>
				<Pill small aria-pressed={g.proof} strong={g.proof} onClick={() => dispatch({ type: "proof", on: !g.proof })}>
					{g.proof ? "Proof: on" : "Proof: off"}
				</Pill>
			</div>
			{gaps.length ? (
				<>
					<h3 className="play-sheet-sub">{`Not in this pack (${gaps.length})`}</h3>
					<ul className="play-credits play-debug-gaps">
						{gaps.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</>
			) : null}
			{quiz.length ? (
				<>
					<h3 className="play-sheet-sub">{`The test (${quiz.length} questions)`}</h3>
					<Quiz items={quiz} lens={g.lens || story.default_lens} fallbackLens={story.default_lens} />
				</>
			) : null}
			<h3 className="play-sheet-sub">State</h3>
			<pre className="play-pre">{JSON.stringify(snapshot, null, 1)}</pre>
			<h3 className="play-sheet-sub">{`Beats (${rows.length})`}</h3>
			<div className="play-table-wrap">
				<table className="play-table">
					<thead>
						<tr>
							<th scope="col">Chapter</th>
							<th scope="col">Id</th>
							<th scope="col">Type</th>
							<th scope="col">Facts</th>
							<th scope="col">Spoken segments</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((r) => (
							<tr key={`${r.chapter}:${r.parent || ""}:${r.id}`} className={step && (step.id === r.id || step.beats?.some((b) => b.id === r.id)) ? "is-current" : undefined}>
								<td>{r.chapter}</td>
								<td>{r.parent ? `${r.parent} > ${r.id}` : r.id}</td>
								<td>{r.type}</td>
								<td>{r.facts.join(", ")}</td>
								<td>
									{r.say.length === 0 ? <span className="play-dim">silent</span> : null}
									{r.say.map((sg) => (
										<div key={sg.clip}>
											<code>{sg.clip}</code> {sg.pace}, {sg.pause_after_ms} ms: {sg.text}
										</div>
									))}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Sheet>
	);
}
