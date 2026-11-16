"use client";

// Small shared interface pieces for Epocheye Play. Generic text only: nothing here names a site.

import { useEffect, useRef } from "react";

export function Pill({ as: Tag = "button", strong = false, small = false, className = "", children, ...rest }) {
	const cls = `play-pill${strong ? " is-strong" : ""}${small ? " is-small" : ""}${className ? ` ${className}` : ""}`;
	if (Tag === "button") {
		return (
			<button type="button" className={cls} {...rest}>
				{children}
			</button>
		);
	}
	return (
		<Tag className={cls} {...rest}>
			{children}
		</Tag>
	);
}

export function TierChip({ tier, tiers }) {
	if (!tier) return null;
	const label = tiers?.[tier] || tier;
	return (
		<span className={`play-chip is-${tier}`}>
			<span className="play-chip-dot" aria-hidden="true" />
			{label}
		</span>
	);
}

const PATHS = {
	left: "M14.5 5.5 8 12l6.5 6.5",
	right: "M9.5 5.5 16 12l-6.5 6.5",
	up: "M5.5 14.5 12 8l6.5 6.5",
	down: "M5.5 9.5 12 16l6.5-6.5",
	plus: "M12 5.5v13M5.5 12h13",
	minus: "M5.5 12h13",
	close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
	check: "M5.5 12.5l4.2 4.2 8.8-9.4",
	turnLeft: "M8 5 4.5 8.5 8 12M4.5 8.5H14a5.5 5.5 0 0 1 0 11h-3",
	turnRight: "M16 5l3.5 3.5L16 12M19.5 8.5H10a5.5 5.5 0 0 0 0 11h3",
};

export function Icon({ name, size = 18 }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
			<path d={PATHS[name]} />
		</svg>
	);
}

// A sheet from the bottom on phones, a centred panel on wide screens.
export function Sheet({ title, onClose, children, wide = false }) {
	const ref = useRef(null);
	// Move focus into the sheet once, and hand it back on close.
	useEffect(() => {
		const before = document.activeElement;
		ref.current?.focus();
		return () => {
			if (before && typeof before.focus === "function" && document.contains(before)) before.focus();
		};
	}, []);
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return (
		<div className="play-sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div ref={ref} className={`play-sheet${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
				<div className="play-sheet-head">
					<h2 className="play-sheet-title">{title}</h2>
					<button type="button" className="play-icon-btn" onClick={onClose} aria-label={`Close ${title}`}>
						<Icon name="close" />
					</button>
				</div>
				<div className="play-sheet-body">{children}</div>
			</div>
		</div>
	);
}
