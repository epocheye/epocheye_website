"use client";

// A leaderboard: places, display names and each row's own result. Never a total, and nothing that
// says how many play: the server opens a board only once it is full enough, and marks the
// player's own row only when it is among the top rows. Until then this shows one neutral line.

import { useEffect, useState } from "react";
import { leaderboard } from "@/lib/play/community";
import "@/components/play/sites/community.css";

function time(s) {
	if (s == null) return "";
	const m = Math.floor(s / 60);
	const r = String(s % 60).padStart(2, "0");
	return `${m}:${r}`;
}

function Row({ row, kind }) {
	const cls = `play-board-row${row.mine ? " is-mine" : ""}`;
	return (
		<li className={cls}>
			<span className="play-board-place">{row.place}</span>
			<span className="play-board-name">
				{row.name}
				{row.mine ? <span className="play-sr"> (you)</span> : null}
			</span>
			{kind === "streak" ? (
				<>
					<span className="play-board-stat">{`${row.days} ${row.days === 1 ? "day" : "days"}`}</span>
					<span className="play-board-stat" aria-hidden="true" />
				</>
			) : (
				<>
					<span className="play-board-stat">{row.accuracy == null ? "" : `${Math.round(row.accuracy * 100)}%`}</span>
					<span className="play-board-stat">{time(row.durationS)}</span>
				</>
			)}
		</li>
	);
}

// kind "site" (with site) or "streak". compact shows the top five.
export default function Leaderboard({ kind, site = null, title, compact = false, empty }) {
	const [data, setData] = useState({ key: "", rows: null, open: false, failed: false });
	const key = `${kind}|${site || ""}`;

	useEffect(() => {
		let live = true;
		leaderboard(kind, site).then((r) => {
			if (!live) return;
			if (r.ok && Array.isArray(r.rows)) setData({ key, rows: r.rows, open: !!r.open, failed: false });
			else setData({ key, rows: null, open: false, failed: true });
		});
		return () => {
			live = false;
		};
	}, [kind, site, key]);

	const ready = data.key === key;
	const rows = ready && data.open && data.rows ? (compact ? data.rows.slice(0, 5) : data.rows) : [];
	const legend = kind === "streak" ? "Place, name, days in a row" : "Place, name, first picks right, time";

	return (
		<section className="play-board" aria-label={title}>
			<div className="play-board-head">
				<span className="play-label">{title}</span>
			</div>
			{!ready ? (
				<p className="play-note">Loading.</p>
			) : data.failed ? (
				<p className="play-note">The board is not available right now.</p>
			) : rows.length === 0 ? (
				<p className="play-note">{empty || "This board is not open yet."}</p>
			) : (
				<ol className="play-board-list" aria-label={legend}>
					{rows.map((r, i) => (
						<Row key={`${i}-${r.name}`} row={r} kind={kind} />
					))}
				</ol>
			)}
		</section>
	);
}
