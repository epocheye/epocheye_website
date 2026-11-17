// The day's board: places, display names, right answers and time. The top 20 only, and only once
// the server opens it (enough rows that it says nothing about how many play). Never a total.

import { formatDuration } from "@/lib/play/daily";
import "@/components/play/sites/community.css";

function Row({ row, max }) {
	return (
		<li className={`play-board-row${row.mine ? " is-mine" : ""}`}>
			<span className="play-board-place">{row.place}</span>
			<span className="play-board-name">
				{row.name}
				{row.mine ? <span className="play-sr"> (you)</span> : null}
			</span>
			<span className="play-board-stat">{max ? `${row.score}/${max}` : row.score}</span>
			<span className="play-board-stat">{row.durationMs == null ? "" : formatDuration(row.durationMs)}</span>
		</li>
	);
}

export default function DailyBoard({ board, max }) {
	const rows = board?.open ? board.rows || [] : [];
	return (
		<section className="play-board" aria-label="Today's board">
			<div className="play-board-head">
				<span className="play-label">Today&apos;s board</span>
			</div>
			{rows.length === 0 ? (
				<p className="play-note">Today&apos;s board is not open yet.</p>
			) : (
				<ol className="play-board-list" aria-label="Place, name, right answers, time">
					{rows.map((r, i) => (
						<Row key={`${i}-${r.name}`} row={r} max={max} />
					))}
				</ol>
			)}
		</section>
	);
}
