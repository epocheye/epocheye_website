"use client";

// The bottom panel of a level: one story line at a time, and the controls each kind of step needs.
// All story copy comes from site.json. The text written here is generic interface text.

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { currentStep, orderSlots, textFor } from "@/lib/play/story/engine";
import { directionFrom, nodeById } from "@/lib/play/pack";
import { Icon, Pill, Switch, TierChip } from "@/components/play/ui";
import OrderBoard from "@/components/play/OrderBoard";

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

// The text of a story line, never more than two lines at a time (brief 5.3).
//
// A line that pages with its clips is given as its sentences: sentence i appears as spoken
// segment i starts. Sentences share a page while they fit on two lines together; the next one
// turns the page. Any other line is one page. A page that would still run to a third line is set
// a little smaller, down to a floor, so it fits. All of this is measured in the browser, with the
// real font at the real width, in a hidden copy of the line.
const FIT_SCALES = [1, 0.94, 0.88, 0.83];

function FittedText({ id, sentences, upto, className, onClick }) {
	const measure = useRef(null);
	const [fit, setFit] = useState({ key: "", sig: "", pages: null, heights: null, sizes: null });
	const key = `${id}\n${sentences.join("\n")}`;

	useEffect(() => {
		const el = measure.current;
		const box = el?.parentElement;
		if (!el || !box || typeof ResizeObserver === "undefined") return undefined;
		const list = key.split("\n").slice(1);
		let width = -1;
		let alive = true;
		const run = () => {
			if (!alive) return;
			el.style.fontSize = "";
			const base = parseFloat(window.getComputedStyle(el).fontSize) || 0;
			// Height of some sentences set together at a scale, and whether that is two lines or fewer.
			const at = (items, scale) => {
				el.style.fontSize = scale === 1 || !base ? "" : `${(base * scale).toFixed(2)}px`;
				el.textContent = "A";
				const one = el.offsetHeight;
				el.textContent = items.map((i) => list[i]).join(" ");
				const h = el.offsetHeight;
				return { h, fits: one > 0 && h <= one * 2 + 2 };
			};
			if (!at([0], 1).h) return; // not laid out yet
			const pages = [];
			let page = [];
			list.forEach((_, i) => {
				if (page.length && !at([...page, i], 1).fits) {
					pages.push(page);
					page = [];
				}
				page.push(i);
			});
			if (page.length) pages.push(page);
			const heights = [];
			const sizes = [];
			for (const items of pages) {
				let pick = null;
				for (const scale of FIT_SCALES) {
					const r = at(items, scale);
					pick = { h: r.h, size: scale === 1 || !base ? null : Number((base * scale).toFixed(2)) };
					if (r.fits) break;
				}
				heights.push(pick.h);
				sizes.push(pick.size);
			}
			el.style.fontSize = "";
			el.textContent = "";
			const sig = JSON.stringify([pages, heights, sizes]);
			setFit((prev) => (prev.key === key && prev.sig === sig ? prev : { key, sig, pages, heights, sizes }));
		};
		// The measuring copy is out of the flow, so filling it never resizes the box being watched.
		const ro = new ResizeObserver((entries) => {
			const w = Math.round(entries[0]?.contentRect?.width ?? 0);
			if (w === width) return;
			width = w;
			run();
		});
		ro.observe(box);
		// A web font that arrives late changes where the lines break.
		document.fonts?.ready?.then(run).catch(() => {});
		return () => {
			alive = false;
			ro.disconnect();
		};
	}, [key]);

	// Until the fit is known, one sentence to a page: never more than was measured.
	const measured = fit.key === key && fit.pages;
	const pages = measured ? fit.pages : sentences.map((_, i) => [i]);
	const at = Math.max(0, Math.min(upto, sentences.length - 1));
	const pi = Math.max(0, pages.findIndex((p) => p.includes(at)));
	const page = pages[pi] || [at];
	const style = {};
	if (measured && fit.heights?.[pi]) style.minHeight = fit.heights[pi];
	if (measured && fit.sizes?.[pi]) style.fontSize = fit.sizes[pi];
	return (
		<>
			<p key={`${id}:${pi}`} className={className} onClick={onClick} style={style} data-paged={sentences.length > 1 ? `${pi + 1}/${pages.length}` : undefined}>
				{page.filter((i) => i <= at).map((i) => (
					<span key={i} className="play-sentence">
						{sentences[i]}{" "}
					</span>
				))}
			</p>
			<span ref={measure} className={`${className} play-line-measure`} aria-hidden="true" />
		</>
	);
}

// paging: { id, sentences, upto } when the line on screen pages with its clips (see Level.jsx).
function Line({ story, beat, lens, role, label, paging, onSources, onAdvance, children }) {
	const text = textFor(beat.text, lens, story.default_lens);
	const kind = role || beat.role || "line";
	const shown = label || ROLE_LABELS[kind];
	const paged = paging && paging.id === beat.id ? paging : null;
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
			<FittedText id={beat.id} sentences={paged ? paged.sentences : [text]} upto={paged ? paged.upto : 0} className={`play-line is-${kind}`} onClick={onAdvance} />
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

// The picture of an evidence item: a path inside the pack. Its box is reserved before it loads,
// from the size the pack gives (image_width and image_height, or image_size), else three by two.
// A file that is not there, or does not load, leaves no trace.
function EvidenceImage({ item, urls }) {
	const src = item.image ? urls.file(item.image) : null;
	const [failed, setFailed] = useState(null);
	if (!src || failed === src) return null;
	const size = Array.isArray(item.image_size) ? item.image_size : [item.image_width ?? item.width, item.image_height ?? item.height];
	const ok = size.length === 2 && size.every((n) => Number.isFinite(n) && n > 0);
	const [w, h] = ok ? size : [1200, 800];
	return (
		<Image
			className="play-evidence-image"
			src={src}
			alt={item.image_alt || item.title || ""}
			width={w}
			height={h}
			style={{ aspectRatio: `${w} / ${h}` }}
			loading="lazy"
			unoptimized
			onError={() => setFailed(src)}
		/>
	);
}

function EvidenceCard({ item, urls }) {
	if (!item) return null;
	return (
		<figure className="play-evidence">
			<figcaption className="play-evidence-title">{item.title}</figcaption>
			<EvidenceImage item={item} urls={urls} />
			{item.quote ? <blockquote className="play-evidence-quote">{`“${item.quote}”`}</blockquote> : null}
			{item.caption ? <p className="play-evidence-caption">{item.caption}</p> : null}
			{item.credit ? <p className="play-evidence-credit">{item.credit}</p> : null}
		</figure>
	);
}

export default function StoryPanel({ slug, site, urls, chapters, state: s, lens, ready, paging, telling, advance, dispatch, onSources, onSheet }) {
	const story = site.story;
	const g = s.game;
	const chapter = chapters[g.chapter];
	const step = currentStep(g, chapters);
	const node = nodeById(site, s.view.node);
	const done = s.screen === "done";
	const home = useRef(null);
	const started = useRef(false);

	// What is on the panel now, as a key: it changes when the panel shows something new.
	const showing = done ? "done" : `${g.chapter}|${g.step}|${s.open || ""}|${g.picked || ""}|${g.afterIndex}|${s.revealing || ""}|${g.restored.length}|${g.placed.length}|${g.pressed ? 1 : 0}`;

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
					<Line story={story} beat={open} lens={lens} label="Evidence" paging={paging} onSources={onSources}>
						<span className="play-count">{`${found} of ${total}`}</span>
					</Line>
					<EvidenceCard item={item(open)} urls={urls} />
					<Continue ready={ready} onClick={advance} label={found === total ? "Continue" : "Keep looking"} />
				</>
			);
		} else {
			// Evidence set at a viewpoint this pack does not have is offered as a card instead.
			const placedAt = (b) => (b.at && nodeById(site, b.at.node) ? b.at : null);
			const loose = step.beats.filter((b) => !placedAt(b));
			const elsewhere = [...new Set(step.beats.filter((b) => placedAt(b) && b.at.node !== node?.id && !g.found.includes(b.id)).map((b) => b.at.node))];
			const here = step.beats.filter((b) => placedAt(b) && b.at.node === node?.id && !g.found.includes(b.id)).length;
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
					{line ? <Line story={story} beat={line} lens={lens} paging={paging} onSources={onSources} onAdvance={advance} /> : null}
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
	} else if (step.kind === "order") {
		const beat = step.beat;
		const total = orderSlots(beat).length;
		const solved = g.placed.length >= total;
		// The card that has just landed is the line on the panel. Before the first, the instruction.
		// A gap card is never the line: once the order is solved it is read where it stands, in the list.
		const told = (beat.cards || []).find((c) => c.id === g.placed[g.placed.length - 1]) || null;
		const gaps = solved ? (beat.cards || []).filter((c) => c.gap) : [];
		const heard = [told, ...gaps].filter(Boolean).map((c) => [c.label, lineText(c)].filter(Boolean).join(". "));
		announce = told ? heard.join(". ") : lineText(beat);
		body = (
			<>
				{told ? (
					<Line story={story} beat={told} lens={lens} label={told.label} paging={paging} onSources={onSources}>
						<span className="play-count">{`${g.placed.length} of ${total}`}</span>
					</Line>
				) : (
					<>
						<div className="play-meta">
							<span className="play-label">Put them in order</span>
							<span className="play-count">{`${g.placed.length} of ${total}`}</span>
							{noteButton}
						</div>
						<p className="play-ui-text">{lineText(beat)}</p>
					</>
				)}
				<OrderBoard
					beat={beat}
					lens={lens}
					fallbackLens={story.default_lens}
					placed={g.placed}
					telling={telling}
					miss={s.miss}
					onSources={onSources}
					onPlace={(id, slot) => dispatch({ type: "place", id, slot })}
				/>
				{solved ? <Continue ready={ready} onClick={advance} /> : null}
			</>
		);
	} else if (step.kind === "reveal") {
		// The whole site is changing. Nothing is said and nothing covers the view.
		announce = "The view is changing.";
	} else if (step.kind === "proof") {
		const beat = step.beat;
		const after = beat.after || [];
		const line = g.pressed ? after[g.afterIndex] || after[after.length - 1] : null;
		announce = lineText(line || beat);
		body = (
			<>
				<Line story={story} beat={line || beat} lens={lens} paging={paging} onSources={onSources} onAdvance={g.pressed ? advance : undefined}>
					{noteButton}
				</Line>
				<Switch label={textFor(beat.toggle_label, lens, story.default_lens)} on={g.proof} onChange={(on) => dispatch({ type: "proof", on })} />
				{g.pressed ? <Continue ready={ready} onClick={advance} /> : null}
			</>
		);
	} else if (step.kind === "vote") {
		const beat = step.beat;
		const options = beat.options || [];
		const mine = options.find((o) => o.id === g.vote);
		const optionText = (o) => textFor(o.text, lens, story.default_lens);
		announce = mine ? `${lineText(beat)} Your pick: ${optionText(mine)}` : lineText(beat);
		body = (
			<>
				<Line story={story} beat={beat} lens={lens} role="question" label="Your vote" onSources={onSources}>
					{noteButton}
				</Line>
				<div className="play-options" role="group" aria-label="Your vote">
					{options.map((o) => {
						const on = g.vote === o.id;
						return (
							<button key={o.id} type="button" className={`play-option is-row is-vote${on ? " is-current" : ""}`} aria-pressed={on} onClick={() => dispatch({ type: "vote", option: o.id })}>
								<span className="play-option-id" aria-hidden="true">{on ? <Icon name="check" size={14} /> : null}</span>
								<span className="play-option-name">{optionText(o)}</span>
								{on ? <span className="play-tag">Your pick</span> : null}
							</button>
						);
					})}
				</div>
				{/* Phase 3: the share of players behind each option goes here, from the server. Until
				    then only the pick of this player is shown. No figure is ever made up. */}
				<p className="play-ui-text">{mine ? "No answer is marked right. Your pick is kept." : "No answer is marked right."}</p>
				{mine ? <Continue ready={ready} onClick={advance} /> : null}
			</>
		);
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
				<Line story={story} beat={step.beat} lens={lens} role={role} paging={paging} onSources={onSources} onAdvance={advance}>
					{noteButton}
				</Line>
				<Continue ready={ready} onClick={advance} />
			</>
		);
	}

	return (
		<section className={`play-panel is-${done ? "done" : step.kind}${s.revealing || (!done && step.kind === "reveal") ? " is-clear" : ""}`} aria-label="Story">
			<div className="play-sr" aria-live="polite" aria-atomic="true">
				{announce}
			</div>
			<div ref={home} className="play-panel-in" tabIndex={-1} data-focus-home="">
				{body}
			</div>
		</section>
	);
}
