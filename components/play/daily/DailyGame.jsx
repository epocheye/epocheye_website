"use client";

// The Missing Piece (brief 1.4): three clues, then where the piece belongs and which version is
// right. The server checks the answers; this page never sees them before it has answered.
// Every clue is an existing fact, caption or quote, shown with its tier and its source.
// One tap per step, no drag, works with the keyboard; focus follows the step for screen readers.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pill, TierChip } from "@/components/play/ui";
import DailyBoard from "@/components/play/daily/DailyBoard";
import DailyReveal from "@/components/play/daily/DailyReveal";
import { myDaily, sendAnswers, startDaily, todaysPuzzle } from "@/components/play/daily/dailyApi";
import { track } from "@/lib/play/api";
import { usePlayFeatures } from "@/components/play/PlayFeatures";
import { formatDay, formatDuration, shareText } from "@/lib/play/daily";

const CHECK_TIMEOUT_MS = 4000;
const WORDS = ["", "one", "two", "three", "four"];

function Clue({ clue, n, of, tiers, headRef }) {
	const quote = clue.kind === "quote";
	return (
		<article className="play-daily-clue">
			<div className="play-daily-clue-head">
				<h2 className="play-label" ref={headRef} tabIndex={-1}>{`Clue ${n} of ${of}`}</h2>
				<TierChip tier={clue.tier} tiers={tiers} />
			</div>
			<p className={`play-daily-clue-text${quote ? " is-quote" : ""}`}>{quote ? `“${clue.text}”` : clue.text}</p>
			{quote && clue.witness ? <p className="play-daily-clue-witness">{clue.witness}</p> : null}
			{clue.source ? (
				<p className="play-daily-source">
					<span className="play-sr">Source: </span>
					{clue.source}
				</p>
			) : null}
		</article>
	);
}

function Options({ q, picked, onPick }) {
	const grid = q.kind === "viewpoint";
	return (
		<div className={`play-daily-options${grid ? " is-grid" : ""}`} role="radiogroup" aria-label={q.prompt}>
			{q.options.map((o) => {
				const on = picked === o.id;
				return (
					<label key={o.id} className={`play-daily-option${on ? " is-picked" : ""}${o.thumb ? " has-thumb" : ""}`}>
						<input className="play-sr" type="radio" name={`q-${q.id}`} value={o.id} checked={on} onChange={() => onPick(o.id)} />
						{o.thumb ? (
							<span className="play-daily-thumb">
								<Image src={o.thumb} alt="" width={512} height={512} sizes="(max-width: 520px) 30vw, 160px" unoptimized />
							</span>
						) : null}
						<span className="play-daily-option-text">
							<span className="play-daily-option-label">{o.label}</span>
							{o.sub ? <span className="play-daily-option-sub">{o.sub}</span> : null}
						</span>
					</label>
				);
			})}
		</div>
	);
}

function Grid({ grid }) {
	return (
		<ol className="play-daily-grid" aria-label="Your answers">
			{grid.map((ok, i) => (
				<li key={i} className={`play-daily-square${ok ? " is-right" : ""}`}>
					<span className="play-sr">{`Question ${i + 1}: ${ok ? "right" : "not right"}`}</span>
				</li>
			))}
		</ol>
	);
}

function QuestionResult({ q }) {
	return (
		<li className="play-daily-qres">
			<p className="play-daily-qres-prompt">{q.prompt}</p>
			<p className="play-msg">
				{q.correct ? (
					<>
						<strong>Right.</strong> {q.pickedLabel}
					</>
				) : (
					<>
						<span className="play-dim">{`You picked: ${q.pickedLabel || "nothing"}. `}</span>
						<strong>{`The answer: ${q.answerLabels.join(" or ")}`}</strong>
					</>
				)}
			</p>
			{q.explain.length ? (
				<div className="play-daily-explain">
					{q.explain.map((line, i) => (
						<p key={i}>{line}</p>
					))}
				</div>
			) : null}
		</li>
	);
}

export default function DailyGame({ initial }) {
	const features = usePlayFeatures(); // the daily board follows PLAY_LEADERBOARDS
	const [data, setData] = useState(initial);
	// checking: asking the server whether this player has already played today
	const [stage, setStage] = useState(initial ? "checking" : "missing");
	const [clueAt, setClueAt] = useState(0);
	const [qAt, setQAt] = useState(0);
	const [answers, setAnswers] = useState({});
	const [outcome, setOutcome] = useState(null);
	const [error, setError] = useState(null);
	const [shareMsg, setShareMsg] = useState("");
	const [shareFallback, setShareFallback] = useState(null);
	const startedRef = useRef(null);
	const headRef = useRef(null);
	const moveFocusRef = useRef(false);

	const puzzle = data?.puzzle || null;
	const day = data?.day || null;
	const slug = puzzle?.site.slug || null;

	// Has this player already played today? If so, straight to their counted result.
	useEffect(() => {
		if (stage !== "checking" || !day) return;
		let live = true;
		const timer = setTimeout(() => {
			if (live) setStage("clues");
		}, CHECK_TIMEOUT_MS);
		myDaily(day).then((r) => {
			if (!live) return;
			clearTimeout(timer);
			if (r.ok && r.played && r.result) {
				setOutcome({ counted: true, already: true, result: r.result, streak: r.streak || 0, board: r.board, ms: r.durationMs ?? null, unranked: r.unranked || null });
				setStage("result");
			} else {
				setStage("clues");
			}
		});
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [stage, day]);

	// The clock starts with the first clue, on the server: the board's time is measured there.
	const startCall = useRef(null);
	useEffect(() => {
		if (stage === "clues" && startedRef.current == null) {
			startedRef.current = Date.now();
			startCall.current = startDaily({ day, puzzle: puzzle.id });
			track("daily_start", { site: slug, props: { puzzle: puzzle.id } });
		}
	}, [stage, slug, puzzle, day]);

	// After a tap moves the player on, focus goes to the new step's heading.
	useEffect(() => {
		if (!moveFocusRef.current) return;
		moveFocusRef.current = false;
		headRef.current?.focus({ preventScroll: false });
	}, [stage, clueAt, qAt]);

	const go = (fn) => {
		moveFocusRef.current = true;
		fn();
	};

	if (stage === "missing" || !puzzle) {
		return (
			<section className="play-page-section">
				<p className="play-msg">There is no puzzle today. Try again later.</p>
				<div>
					<Pill as={Link} href="/play">
						All sites
					</Pill>
				</div>
			</section>
		);
	}

	const clues = puzzle.clues;
	const questions = puzzle.questions;
	const q = questions[qAt];
	const lastQ = qAt === questions.length - 1;

	const reload = async () => {
		setError(null);
		const r = await todaysPuzzle();
		if (!r.ok || !r.puzzle) {
			setError({ text: "Could not load the puzzle. Try again." });
			return;
		}
		startedRef.current = null;
		setData({ day: r.day, puzzle: r.puzzle });
		setAnswers({});
		setClueAt(0);
		setQAt(0);
		setOutcome(null);
		go(() => setStage("checking"));
	};

	const submit = async () => {
		setError(null);
		setStage("sending");
		await startCall.current;
		const r = await sendAnswers({ day, puzzle: puzzle.id, answers });
		if (!r.ok) {
			setStage("questions");
			if (r.error === "new_day") setError({ text: "A new puzzle is out. This one has closed.", reload: true });
			else if (r.status === 429) setError({ text: "Too many tries. Wait a minute, then check again." });
			else setError({ text: "Could not check your answers. Try again." });
			return;
		}
		setOutcome({ counted: r.counted, already: false, result: r.result, attempt: r.attempt || null, streak: r.streak || 0, board: r.board, ms: r.durationMs ?? null, unranked: r.unranked || null });
		track("daily_finish", { site: slug, props: { puzzle: puzzle.id, score: r.result.score, max: r.result.max, counted: !!r.counted } });
		go(() => setStage("result"));
	};

	const head = (
		<header className="play-page-head play-daily-head">
			<span className="play-label">{`The Missing Piece, ${formatDay(day)}`}</span>
			<h1>{puzzle.element.name}</h1>
			<p className="play-page-lead">{`From ${puzzle.site.name}. Three clues, then ${questions.length === 1 ? "one question" : `${WORDS[questions.length] || questions.length} questions`}.`}</p>
		</header>
	);

	if (stage === "checking") {
		return (
			<>
				{head}
				<p className="play-note" role="status">
					Loading.
				</p>
			</>
		);
	}

	if (stage === "clues") {
		const last = clueAt === clues.length - 1;
		return (
			<>
				{head}
				<section className="play-daily-step" aria-label="Clues">
					<ol className="play-daily-clues">
						{clues.slice(0, clueAt + 1).map((c, i) => (
							<li key={i} className={i === clueAt ? "is-current" : ""}>
								<Clue clue={c} n={i + 1} of={clues.length} tiers={puzzle.tiers} headRef={i === clueAt ? headRef : null} />
							</li>
						))}
					</ol>
					<div className="play-daily-actions">
						<Pill
							strong
							onClick={() =>
								go(() => {
									if (last) setStage("questions");
									else setClueAt(clueAt + 1);
								})
							}
						>
							{last ? "To the questions" : "Next clue"}
						</Pill>
					</div>
				</section>
			</>
		);
	}

	if (stage === "questions" || stage === "sending") {
		const picked = answers[q.id] || null;
		const sending = stage === "sending";
		return (
			<>
				{head}
				<section className="play-daily-step" aria-label="Questions">
					<fieldset className="play-daily-q" disabled={sending}>
						<legend className="play-daily-q-legend">
							<span className="play-label" ref={headRef} tabIndex={-1}>{`Question ${qAt + 1} of ${questions.length}`}</span>
							<span className="play-daily-q-prompt">{q.prompt}</span>
							{q.hint ? <span className="play-note">{q.hint}</span> : null}
						</legend>
						<Options q={q} picked={picked} onPick={(id) => setAnswers((a) => ({ ...a, [q.id]: id }))} />
					</fieldset>
					<div className="play-daily-actions">
						<Pill
							onClick={() =>
								go(() => {
									if (qAt > 0) return setQAt(qAt - 1);
									setClueAt(clues.length - 1);
									setStage("clues");
								})
							}
							disabled={sending}
						>
							Back
						</Pill>
						<Pill
							strong
							disabled={!picked || sending}
							onClick={() => {
								if (lastQ) submit();
								else go(() => setQAt(qAt + 1));
							}}
						>
							{lastQ ? (sending ? "Checking" : "Check my answers") : "Next question"}
						</Pill>
					</div>
					<p className={`play-msg${error ? " is-error" : ""}`} role="status" aria-live="polite">
						{error ? error.text : ""}
					</p>
					{error?.reload ? (
						<div>
							<Pill onClick={reload}>{"Load today's puzzle"}</Pill>
						</div>
					) : null}
				</section>
			</>
		);
	}

	// result
	const res = outcome.result;
	// Defined here, where there is a result, so nothing reads it before there is one.
	const share = async () => {
		const text = shareText({ siteName: res.site.name, day, grid: res.grid, streak: outcome.streak, url: `${window.location.origin}/play/daily` });
		setShareFallback(null);
		if (navigator.share) {
			try {
				await navigator.share({ text });
				setShareMsg("Shared.");
				track("share", { site: slug, props: { what: "daily", via: "share" } });
				return;
			} catch (err) {
				if (err?.name === "AbortError") return;
			}
		}
		try {
			await navigator.clipboard.writeText(text);
			setShareMsg("Copied. Paste it anywhere.");
			track("share", { site: slug, props: { what: "daily", via: "copy" } });
		} catch {
			setShareMsg("Copy this:");
			setShareFallback(text);
		}
	};

	const time = outcome.counted && outcome.ms != null ? formatDuration(outcome.ms) : null;
	return (
		<>
			{head}
			<section className="play-daily-step play-daily-result" aria-label="Your result">
				<div className="play-daily-score">
					<h2 className="play-label" ref={headRef} tabIndex={-1}>
						Your result
					</h2>
					<Grid grid={res.grid} />
					<p className="play-daily-score-line">
						{`${res.score} of ${res.max} right`}
						{time ? <span className="play-dim">{` in ${time}`}</span> : null}
					</p>
					{outcome.already ? <p className="play-note">You played today. This is your counted result.</p> : null}
					{!outcome.counted && !outcome.already ? (
						<p className="play-note">{`Your first answer today is the one that counts. This try: ${outcome.attempt ? `${outcome.attempt.score} of ${outcome.attempt.max}` : "not counted"}.`}</p>
					) : null}
					{outcome.streak > 0 ? <p className="play-note">{`Solved ${outcome.streak} ${outcome.streak === 1 ? "day" : "days"} in a row.`}</p> : null}
					{outcome.unranked === "new" ? (
						<p className="play-note">Your first day is not on the board. From your next day on, your results are.</p>
					) : outcome.unranked === "time" ? (
						<p className="play-note">This result is not on the board: its time could not be checked.</p>
					) : null}
				</div>

				<div className="play-daily-actions">
					<Pill strong onClick={share}>
						Share result
					</Pill>
				</div>
				<p className="play-msg" role="status" aria-live="polite">
					{shareMsg}
				</p>
				{shareFallback ? <pre className="play-daily-sharetext">{shareFallback}</pre> : null}

				<ol className="play-daily-qres-list">
					{res.questions.map((qr) => (
						<QuestionResult key={qr.id} q={qr} />
					))}
				</ol>

				{res.reveal ? <DailyReveal reveal={res.reveal} name={res.element.name} /> : null}
				{res.element.image ? (
					<figure className="play-daily-evidence">
						<Image
							src={res.element.image.src}
							alt={res.element.name}
							width={res.element.image.w || 1200}
							height={res.element.image.h || 900}
							sizes="(max-width: 720px) 100vw, 688px"
							unoptimized
						/>
						{res.element.image.credit ? <figcaption className="play-note">{res.element.image.credit}</figcaption> : null}
					</figure>
				) : null}

				<div className="play-daily-chapter">
					<span className="play-label">Where it belongs</span>
					<p className="play-daily-chapter-line">{`This piece belongs to Chapter ${res.chapter.n}`}</p>
					<p className="play-note">{res.chapter.years ? `${res.chapter.title}, ${res.chapter.years}` : res.chapter.title}</p>
					<div>
						<Pill as={Link} href={`/play/${res.site.slug}?ch=${res.chapter.n}`} strong>
							{`Play Chapter ${res.chapter.n}`}
						</Pill>
					</div>
				</div>
			</section>

			<section className="play-page-section">
				{features.leaderboards ? <DailyBoard board={outcome.board} max={res.max} /> : null}
				<p className="play-fine">
					A new piece every day.{features.leaderboards ? <> <Link href="/play/leaderboards">All leaderboards</Link></> : null}
				</p>
			</section>
		</>
	);
}
