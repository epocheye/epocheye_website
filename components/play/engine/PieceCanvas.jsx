"use client";

// The Restore step: one small real-time canvas with the pack's piece. The player turns it by
// dragging or with the two turn buttons until it snaps, then sets it in place.

import { useEffect, useRef, useState } from "react";
import { Icon, Pill } from "@/components/play/ui";

export default function PieceCanvas({ url, id, name, turn, onPlace }) {
	const holder = useRef(null);
	const coreRef = useRef(null);
	const [piece, setPiece] = useState({ loaded: false, placeholder: false, snapped: false, failed: false });

	useEffect(() => {
		let core = null;
		let cancelled = false;
		const el = holder.current;
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		import("./pieceCore")
			.then(({ PieceCore }) => {
				if (cancelled || !el) return;
				core = new PieceCore(el, {
					url,
					id,
					turn,
					reducedMotion,
					onState: (s) => {
						if (!cancelled) setPiece({ loaded: s.loaded, placeholder: s.placeholder, snapped: s.snapped, failed: false });
					},
				});
				coreRef.current = core;
			})
			.catch(() => {
				// No 3D at all on this device: the step must still be playable.
				if (!cancelled) setPiece({ loaded: true, placeholder: true, snapped: true, failed: true });
			});
		return () => {
			cancelled = true;
			coreRef.current = null;
			core?.dispose();
		};
	}, [url, id, turn]);

	const left = () => coreRef.current?.stepLeft();
	const right = () => coreRef.current?.stepRight();
	const onKeyDown = (e) => {
		if (e.key === "ArrowLeft") left();
		else if (e.key === "ArrowRight") right();
		else return;
		e.preventDefault();
	};

	let status = "Loading the piece";
	if (piece.failed) status = "This browser cannot show the piece. You can still set it in place.";
	else if (piece.snapped) status = "It fits.";
	else if (piece.loaded) status = "Turn it until it matches the faint outline.";

	return (
		<div className="play-piece">
			<div
				ref={holder}
				className={`play-piece-canvas${piece.snapped ? " is-snapped" : ""}`}
				tabIndex={0}
				role="application"
				aria-label={`${name || "The piece"}. Drag to turn it, or use the left and right arrow keys.`}
				onKeyDown={onKeyDown}
			/>
			{piece.placeholder && !piece.failed ? (
				<p className="play-piece-note">Placeholder shape. The 3D piece is not in this pack yet.</p>
			) : null}
			<p className="play-piece-status" role="status" aria-live="polite">
				{status}
			</p>
			<div className="play-piece-actions">
				<button type="button" className="play-icon-btn" onClick={left} disabled={piece.snapped || !piece.loaded} aria-label="Turn left">
					<Icon name="turnLeft" />
				</button>
				<button type="button" className="play-icon-btn" onClick={right} disabled={piece.snapped || !piece.loaded} aria-label="Turn right">
					<Icon name="turnRight" />
				</button>
				<Pill strong={piece.snapped} disabled={!piece.snapped} onClick={onPlace}>
					Set it in place
				</Pill>
			</div>
		</div>
	);
}
