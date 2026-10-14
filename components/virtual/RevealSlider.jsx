"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { trackVirtual } from "./track";

// Before/after reveal. Left of the handle: `before` (the palace today).
// Right of the handle: `after` (the reconstruction). Works with mouse, touch and keys;
// `touch-action: pan-y` keeps vertical page scrolling on phones.
export default function RevealSlider({ before, after, priority = false, eventName = "virtual_slider_drag" }) {
	const [pos, setPos] = useState(50);
	const frameRef = useRef(null);
	const draggingRef = useRef(false);
	const trackedRef = useRef(false);

	const markUsed = () => {
		if (trackedRef.current) return;
		trackedRef.current = true;
		trackVirtual(eventName);
	};

	const moveTo = (clientX) => {
		const rect = frameRef.current?.getBoundingClientRect();
		if (!rect || !rect.width) return;
		const next = ((clientX - rect.left) / rect.width) * 100;
		setPos(Math.min(100, Math.max(0, next)));
	};

	const onPointerDown = (e) => {
		draggingRef.current = true;
		e.currentTarget.setPointerCapture?.(e.pointerId);
		moveTo(e.clientX);
		markUsed();
	};
	const onPointerMove = (e) => {
		if (draggingRef.current) moveTo(e.clientX);
	};
	const endDrag = () => {
		draggingRef.current = false;
	};

	const onKeyDown = (e) => {
		const step = e.shiftKey ? 10 : 5;
		let next = null;
		if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos - step;
		else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos + step;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = 100;
		if (next === null) return;
		e.preventDefault();
		setPos(Math.min(100, Math.max(0, next)));
		markUsed();
	};

	const sizes = "(min-width: 1024px) 1024px, 100vw";
	const label =
		"pointer-events-none absolute top-3 rounded-full border border-white/20 bg-black/50 px-3 py-1 font-montserrat text-[10px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm";

	return (
		<div
			ref={frameRef}
			className="relative aspect-4/3 w-full cursor-ew-resize select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] sm:aspect-video"
			style={{ touchAction: "pan-y" }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}>
			<Image
				src={after.src}
				alt={after.alt}
				fill
				priority={priority}
				sizes={sizes}
				draggable={false}
				className="object-cover"
			/>
			<div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
				<Image
					src={before.src}
					alt={before.alt}
					fill
					priority={priority}
					sizes={sizes}
					draggable={false}
					className="object-cover"
				/>
			</div>

			<span className={`${label} left-3`}>{before.label}</span>
			<span className={`${label} right-3 text-right`}>
				{after.label}
				{after.note ? <span className="block text-[8px] tracking-[0.15em] text-white/60">{after.note}</span> : null}
			</span>

			<div className="pointer-events-none absolute inset-y-0 w-px bg-white/90" style={{ left: `${pos}%` }} />
			<div
				role="slider"
				tabIndex={0}
				aria-label={`Drag to compare: ${before.label} and ${after.label}`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(pos)}
				aria-orientation="horizontal"
				onKeyDown={onKeyDown}
				className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-black/40 text-white backdrop-blur-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
				style={{ left: `${pos}%` }}>
				<svg width="20" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
					<path
						d="M6 1L1 6l5 5M14 1l5 5-5 5"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</div>
		</div>
	);
}
