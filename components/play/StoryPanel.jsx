"use client";

// The bottom panel of a level: one story line at a time, and the controls each kind of step needs.
// All story copy comes from site.json. The text written here is generic interface text.

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { currentStep, textFor } from "@/lib/play/story/engine";
import { directionFrom, nodeById } from "@/lib/play/pack";
import { Icon, Pill, TierChip } from "@/components/play/ui";

const PieceCanvas = dynamic(() => import("./engine/PieceCanvas"), { ssr: false });

// Weakest first. A line that rests on several facts is only as sure as the least sure of them.
const TIER_ORDER = ["unknown", "legend", "reconstruction", "reading", "record"];

export function tierOf(story, beat) {
	if (!beat) return null;
	if (beat.tier) return beat.tier;
	const tiers = factsOf(story, beat).map((f) => f.tier).filter(Boolean);
	if (tiers.length === 0) return null;
	const rank = (t) => (TIER_ORDER.includes(t) ? TIER_ORDER.indexOf(t) : TIER_ORDER.length);
	return tiers.reduce((a, b) => (rank(b) < rank(a) ? b : a));
}

export function factsOf(story, beat) {
	return (beat?.facts || []).map((id) => (story.facts || []).find((f) => f.id === id)).filter(Boolean);
}

const ROLE_LABELS = { question: "The question", answer: "The answer", hook: "Next" };

function Line({ story, beat, lens, role, label, onSources, onAdvance, children }) {
	const text = textFor(beat.text, lens, story.default_lens);
	const kind = role || beat.role || "line";
	const shown = label || ROLE_LABELS[kind];
	return (
		<div className="play-line-block">
			<div className="play-meta">
				{shown ? <span className="play-label">{shown}</span> : null}
				<TierChip tier={tierOf(story, beat)} tiers={story.tiers} />
				{beat.facts?.length ? (
					<button type="button" className="play-link-btn" onClick={() => onSources(beat)}>
						Source
					</button>
				) : null}
				{children}
			</div>
			<p key={beat.id} className={`play-line is-${kind}`} onClick={onAdvance}>
				{text}
			</p>
		</div>
	);
}

function Continue({ ready, onClick, label = "Continue" }) {
	return (
		<div className="play-actions">
			<Pill strong={ready} className="play-continue" onClick={onClick}>
				{label}
			</Pill>
		</div>
	);
}

function ShareButton({ slug, chapter, story, text }) {
	const [note, setNote] = useState("");
	const share = async () => {
		const url = `${window.location.origin}/play/${slug}?ch=${chapter.n ?? chapter.index}`;
		if (navigator.share) {
			try {
				await navigator.share({ title: story.title, text, url });
				return;
			} catch (err) {
				if (err && err.name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			setNote("Link copied.");
		} catch {
			setNote(url);
		}
	};
	return (
		<>
			<Pill onClick={share}>Share</Pill>
			<span className="play-note" role="status" aria-live="polite">
				{note}
			</span>
		</>
	);
}

function EvidenceCard({ item }) {
	if (!item) return null;
	return (
		<figure className="play-evidence">
			<figcaption className="play-evidence-title">{item.title}</figcaption>
			{item.quote ? <blockquote className="play-evidence-quote">{`“${item.quote}”`}</blockquote> : null}
			{item.caption ? <p className="play-evidence-caption">{item.caption}</p> : null}
			{item.credit ? <p className="play-evidence-credit">{item.credit}</p> : null}
		</figure>
	);
}

export default function StoryPanel({ slug, site, urls, chapters, state: s, lens, ready, advance, dispatch, onSources, onSheet }) {
	const story = site.story;
	const g = s.game;
	const chapter = chapters[g.chapter];
	const step = currentStep(g, chapters);
	const node = nodeById(site, s.view.node);
	const done = s.screen === "done";
	const home = useRef(null);
	const started = useRef(false);

	// What is on the panel now, as a key: it changes when the panel shows something new.
	const showing = done ? "done" : `${g.chapter}|${g.step}|${s.open || ""}|${g.picked || ""}|${g.afterIndex}|${s.revealing || ""}|${g.restored.length}`;

	// The control just used is often removed with the step it belonged to (an option, "Set it in
	// place"). Focus then falls to the page. Bring it back to the panel so the next Tab starts here.
	useEffect(() => {
		if (!started.current) {
			started.current = true; // not on arrival: the page keeps its own first focus
			return;
		}
		const at = document.activeElement;
		if (!at || at === document.body) home.current?.focus({ preventScroll: true });
	}, [showing]);

	if (!done && (!step || !chapter)) return null;

	const note = done ? null : chapter.side_notes?.[lens];
	const noteButton =
		note && !s.noteSeen ? (
			<button type="button" className="play-link-btn" onClick={() => onSheet("note")}>
				Side note
			</button>
		) : null;

	let body = null;
	// The words a screen reader is told when the panel changes. They go into one live region
	// that stays mounted for the whole level (see the return), so every change is announced.
	let announce = "";
	const lineText = (beat) => textFor(beat?.text, lens, story.default_lens);

	if (done) {
		const required = chapters.filter((c) => !c.preview);
		const allDone = required.every((c) => g.chaptersDone.includes(c.id));
		const previews = chapters.filter((c) => c.preview);
		announce = allDone ? "You have reached the end of what is ready to play." : "That is the end of this part.";
		body = (
			<div className="play-card">
				<span className="play-label">{story.title}</span>
				<p className="play-card-line">{announce}</p>
				<div className="play-actions is-left">
					{previews.map((p) => (
						<Pill key={p.id} strong onClick={() => dispatch({ type: "jump", chapter: p.index })}>
							{p.title}
						</Pill>
					))}
					<Pill onClick={() => onSheet("chapters")}>Chapters</Pill>
					<Pill as={Link} href="/play">
						All sites
					</Pill>
				</div>
			</div>
		);
	} else if (step.kind === "lens") {
		announce = lineText(step.beat);
		body = (
			<>
				<p className="play-ui-text">{textFor(step.beat.text, lens, story.default_lens)}</p>
				<div className="play-options is-grid" role="group" aria-label="How the story is told">
					{(story.lenses || []).map((l) => (
						<button
							key={l.id}
							type="button"
							className={`play-option${g.lens === l.id ? " is-current" : ""}`}
							onClick={() => dispatch({ type: "lens", lens: l.id, advance: true })}
						>
							<span className="play-option-name">{l.name}</span>
							<span className="play-option-blurb">{l.blurb}</span>
						</button>
					))}
				</div>
			</>
		);
	} else if (step.kind === "look") {
		const total = step.beats.length;
		const found = g.found.length;
		const open = s.open ? step.beats.find((b) => b.id === s.open) : null;
		const item = (b) => (story.evidence || []).find((e) => e.id === b.evidence);
		if (open) {
			announce = [item(open)?.title, lineText(open)].filter(Boolean).join(". ");
			body = (
				<>
					<Line story={story} beat={open} lens={lens} label="Evidence" onSources={onSources}>
						<span className="play-count">{`${found} of ${total}`}</span>
					</Line>
					<EvidenceCard item={item(open)} />
					<Continue ready={ready} onClick={advance} label={found === total ? "Continue" : "Keep looking"} />
				</>
			);
		} else {
			const loose = step.beats.filter((b) => !b.at);
			const elsewhere = [...new Set(step.beats.filter((b) => b.at && b.at.node !== node?.id && !g.found.includes(b.id)).map((b) => b.at.node))];
			const here = step.beats.filter((b) => b.at && b.at.node === node?.id && !g.found.includes(b.id)).length;
			const hint =
				found === total
					? "You have found all of it."
					: here > 0
						? "Look around. Tap each marker in the view."
						: "Nothing more to find from here. Open a card or move on.";
			announce = `Find the evidence. ${found} of ${total}. ${hint}`;
			body = (
				<>
					<div className="play-meta">
						<span className="play-label">Find the evidence</span>
						<span className="play-count">{`${found} of ${total}`}</span>
						{noteButton}
					</div>
					<p className="play-ui-text">{hint}</p>
					{loose.length ? (
						<div className="play-tray" role="group" aria-label="Evidence cards">
							{loose.map((b) => {
								const done = g.found.includes(b.id);
								return (
									<button key={b.id} type="button" className={`play-tray-card${done ? " is-done" : ""}`} onClick={() => dispatch({ type: "find", id: b.id })}>
										<span className="play-tray-mark" aria-hidden="true">{done ? <Icon name="check" size={14} /> : null}</span>
										<span>{item(b)?.title || "Evidence"}</span>
										<span className="play-sr">{done ? ", found" : ", not yet read"}</span>
									</button>
								);
							})}
						</div>
					) : null}
					<div className="play-actions is-left">
						{elsewhere.map((id) => (
							<Pill key={id} small onClick={() => dispatch({ type: "go", node: id })}>
								{`Go to ${nodeById(site, id)?.name || id}`}
							</Pill>
						))}
						<Pill small onClick={() => onSheet("evidence")}>
							List
						</Pill>
						{found === total ? (
							<Pill strong className="play-continue" onClick={advance}>
								Continue
							</Pill>
						) : null}
					</div>
				</>
			);
		}
	} else if (step.kind === "choice") {
		const beat = step.beat;
		const tried = s.tried[beat.id] || [];
		if (!g.picked) {
			announce = lineText(beat);
			body = (
				<>
					<Line story={story} beat={beat} lens={lens} role="question" label="Decide" onSources={onSources}>
						{noteButton}
					</Line>
					<div className="play-options" role="group" aria-label="Your choices">
						{beat.options.map((o) => {
							const was = tried.includes(o.id);
							return (
								<button key={o.id} type="button" className="play-option is-row" disabled={was} onClick={() => dispatch({ type: "pick", option: o.id })}>
									<span className="play-option-id" aria-hidden="true">{o.id}</span>
									<span className="play-option-name">{textFor(o.text, lens, story.default_lens)}</span>
									{was ? <span className="play-tag">Tried</span> : null}
								</button>
							);
						})}
					</div>
				</>
			);
		} else {
			const opt = beat.options.find((o) => o.id === g.picked);
			const after = opt?.after || [];
			const line = after[g.afterIndex];
			const last = g.afterIndex + 1 >= after.length;
			announce = lineText(line);
			body = (
				<>
					<p className="play-picked">{`You picked: ${textFor(opt?.text, lens, story.default_lens)}`}</p>
					{line ? <Line story={story} beat={line} lens={lens} onSources={onSources} onAdvance={advance} /> : null}
					<Continue ready={ready} onClick={advance} label={last && !opt?.accepted ? "Choose again" : "Continue"} />
				</>
			);
		}
	} else if (step.kind === "restore") {
		const r = (site.restorations || []).find((x) => x.id === step.beat.restoration);
		const id = step.beat.restoration;
		const placed = g.restored.includes(id);
		const place = () => dispatch({ type: "restore", id, look: r?.target && node ? directionFrom(node, r.target) : null });
		if (!placed) {
			announce = [r?.name, lineText(step.beat)].filter(Boolean).join(". ");
			body = (
				<>
					<div className="play-meta">
						<span className="play-label">Restore</span>
						<TierChip tier={r?.tier} tiers={story.tiers} />
						{step.beat.facts?.length ? (
							<button type="button" className="play-link-btn" onClick={() => onSources(step.beat)}>
								Source
							</button>
						) : null}
					</div>
					{r ? <h2 className="play-restore-name">{r.name}</h2> : null}
					<p className="play-ui-text">{textFor(step.beat.text, lens, story.default_lens)}</p>
					<PieceCanvas url={r?.piece ? urls.file(r.piece) : null} id={id} name={r?.name} turn={r?.turn} onPlace={place} />
				</>
			);
		} else if (s.revealing === id) {
			// The picture is changing. Nothing is said and nothing covers the view.
			announce = "The view is changing.";
		} else {
			announce = r?.name ? `Restored. ${r.name}` : "Restored.";
			body = (
				<>
					<div className="play-meta">
						<span className="play-label">Restored</span>
						<TierChip tier={r?.tier} tiers={story.tiers} />
					</div>
					<p className="play-line is-answer">{r?.name}</p>
					{(r?.evidence || []).map((e) => (
						<p key={e} className="play-evidence-credit">{e}</p>
					))}
					<Continue ready onClick={advance} />
				</>
			);
		}
	} else if (step.kind === "know") {
		const text = textFor(step.beat.text, lens, story.default_lens);
		announce = `You now know. ${text}`;
		body = (
			<div className="play-card">
				<div className="play-meta">
					<span className="play-label">You now know</span>
					<TierChip tier={tierOf(story, step.beat)} tiers={story.tiers} />
				</div>
				<p className="play-card-line">{text}</p>
				<ul className="play-card-sources" aria-label="Sources">
					{factsOf(story, step.beat).map((f) => (
						<li key={f.id}>{f.source}</li>
					))}
				</ul>
				<div className="play-actions is-left">
					<ShareButton slug={slug} chapter={chapter} story={story} text={text} />
					<Pill strong={ready} className="play-continue" onClick={advance}>
						Continue
					</Pill>
				</div>
			</div>
		);
	} else {
		// line, answer, hook, and any kind this build does not know: show the text and move on.
		const role = step.kind === "answer" ? "answer" : step.kind === "hook" ? "hook" : step.beat.role;
		announce = lineText(step.beat);
		body = (
			<>
				<Line story={story} beat={step.beat} lens={lens} role={role} onSources={onSources} onAdvance={advance}>
					{noteButton}
				</Line>
				<Continue ready={ready} onClick={advance} />
			</>
		);
	}

	return (
		<section className={`play-panel is-${done ? "done" : step.kind}${s.revealing ? " is-clear" : ""}`} aria-label="Story">
			<div className="play-sr" aria-live="polite" aria-atomic="true">
				{announce}
			</div>
			<div ref={home} className="play-panel-in" tabIndex={-1} data-focus-home="">
				{body}
			</div>
		</section>
	);
}
