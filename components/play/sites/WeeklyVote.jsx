"use client";

// The weekly vote (brief 1.5): which locked site gets built next. One vote per player per week,
// changeable within the week. Voting needs an email (brief 5.4); a vote counts once that email is
// confirmed. Results are percentages, shown only once the week has enough counted votes. No count
// of votes or voters is ever shown.

import { useEffect, useId, useState } from "react";
import { castWeeklyVote, myWeeklyVote, weeklyResults } from "@/lib/play/community";
import EmailSheet from "@/components/play/EmailSheet";
import { Pill } from "@/components/play/ui";
import "@/components/play/sites/community.css";

// sites: [{ slug, name, place, label }]. picked: a slug from the address, or null.
export default function WeeklyVote({ sites, picked = null }) {
	const id = useId();
	const [me, setMe] = useState({ loaded: false, mine: null, email: "none" });
	const [choice, setChoice] = useState(picked);
	const [results, setResults] = useState(null); // null loading, { failed } or { enough, shares }
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState({ text: "", error: false });
	const [sheet, setSheet] = useState(null); // null or { vote: slug|null }

	useEffect(() => {
		let live = true;
		myWeeklyVote().then((r) => {
			if (live) setMe({ loaded: true, mine: r.ok ? r.mine || null : null, email: r.ok ? r.email || "none" : "none" });
		});
		weeklyResults().then((r) => {
			if (live) setResults(r.ok ? { enough: !!r.enough, shares: r.shares || [] } : { failed: true });
		});
		return () => {
			live = false;
		};
	}, []);

	const selected = choice || me.mine || null;
	const nameOf = (slug) => sites.find((s) => s.slug === slug)?.name || slug;

	const refresh = () =>
		weeklyResults().then((r) => {
			if (r.ok) setResults({ enough: !!r.enough, shares: r.shares || [] });
		});

	const cast = async (slug) => {
		setBusy(true);
		setMsg({ text: "", error: false });
		const r = await castWeeklyVote(slug);
		setBusy(false);
		if (r.ok) {
			setMe((m) => ({ ...m, mine: slug }));
			setMsg({
				text: r.counted
					? `Your vote for ${nameOf(slug)} is in.`
					: `Your vote for ${nameOf(slug)} is in. It counts once you open the link we emailed you.`,
				error: false,
			});
			refresh();
			return;
		}
		if (r.error === "email_required") {
			// No email request on this player (or it expired): ask for one.
			setMe((m) => ({ ...m, email: "none" }));
			setMsg({ text: "Voting needs an email. If you have played on another device, open the link we emailed you, then vote.", error: false });
			setSheet((s) => s || { vote: slug });
			return;
		}
		setMsg({
			text: r.status === 429 ? "Too many tries. Wait a minute and try again." : "That did not go through. Try again.",
			error: true,
		});
	};

	const submit = (e) => {
		e.preventDefault();
		if (busy) return;
		if (!selected) {
			setMsg({ text: "Pick a site first.", error: true });
			return;
		}
		if (selected === me.mine) {
			setMsg({ text: `You already voted for ${nameOf(selected)} this week.`, error: false });
			return;
		}
		if (me.email === "none") {
			setSheet({ vote: selected });
			return;
		}
		cast(selected);
	};

	const emailSent = () => {
		const vote = sheet?.vote || null;
		setMe((m) => ({ ...m, email: m.email === "confirmed" ? "confirmed" : "pending" }));
		if (vote) cast(vote);
	};

	const changing = !!me.mine && selected !== me.mine;

	return (
		<>
			<form className="play-page-section" onSubmit={submit} aria-describedby={`${id}-msg`}>
				<fieldset className="play-vote-list">
					<legend className="play-sr">Sites you can vote for</legend>
					{sites.map((s) => (
						<label key={s.slug} className="play-vote-option">
							<input type="radio" name={`${id}-site`} value={s.slug} checked={selected === s.slug} onChange={() => setChoice(s.slug)} />
							<span className="play-vote-text">
								<span className="play-vote-name">{s.name}</span>
								<span className="play-vote-meta">
									{s.place}. {s.label}.
								</span>
							</span>
							{me.mine === s.slug ? <span className="play-label play-vote-mine">Your vote</span> : null}
						</label>
					))}
				</fieldset>
				<div className="play-vote-actions">
					<Pill strong type="submit" disabled={busy || !me.loaded}>
						{busy ? "Sending" : changing ? "Change my vote" : "Vote"}
					</Pill>
					{me.email === "none" ? <span className="play-note">Voting needs an email. We ask for it when you vote.</span> : null}
				</div>
				<p id={`${id}-msg`} className={`play-msg${msg.error ? " is-error" : ""}`} role="status" aria-live="polite">
					{msg.text}
				</p>
				{me.email === "pending" ? (
					<p className="play-note">
						Open the link we emailed you and tap Confirm to make your vote count.{" "}
						<button type="button" className="play-site-early" onClick={() => setSheet({ vote: null })}>
							Send it again
						</button>
					</p>
				) : null}
			</form>

			<section className="play-page-section" aria-labelledby={`${id}-results`}>
				<h2 id={`${id}-results`}>This week so far</h2>
				{results == null ? (
					<p className="play-note">Loading.</p>
				) : results.failed ? (
					<p className="play-note">The results are not available right now.</p>
				) : !results.enough ? (
					<p className="play-msg">The shares show here once enough people have voted this week.</p>
				) : (
					<ul className="play-vote-results">
						{results.shares.map((r) => (
							<li key={r.id} className="play-vote-share">
								<span className="play-vote-share-name">{nameOf(r.id)}</span>
								<span className="play-vote-share-pct">{`${r.pct}%`}</span>
								<span className="play-vote-share-bar" aria-hidden="true">
									<span style={{ width: `${r.pct}%` }} />
								</span>
							</li>
						))}
					</ul>
				)}
				<p className="play-fine">The week runs Monday to Sunday, India time. A vote counts once its email is confirmed.</p>
			</section>

			{sheet ? <EmailSheet reason="vote" onClose={() => setSheet(null)} onSent={emailSent} /> : null}
		</>
	);
}
