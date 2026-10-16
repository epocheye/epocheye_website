"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { trackVirtual } from "./track";

// Before/after drag slider. Left of the handle: the palace today. Right: the reconstruction,
// from the same angle. Mouse, touch and keys; `touch-action: pan-y` keeps page scrolling on phones.
// A missing image shows a labelled slot on preview builds.
export default function ThenNow({ today, then, labels, showSlots }) {
	const [pos, setPos] = useState(50);
	const frameRef = useRef(null);
	const dragging = useRef(false);
	const tracked = useRef(false);

	const markUsed = () => {
		if (tracked.current) return;
		tracked.current = true;
		trackVirtual("virtual_slider_drag");
	};
	const moveTo = (clientX) => {
		const rect = frameRef.current?.getBoundingClientRect();
		if (!rect?.width) return;
		setPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
	};
	const onKeyDown = (e) => {
		const step = e.shiftKey ? 10 : 5;
		const next = { ArrowLeft: pos - step, ArrowDown: pos - step, ArrowRight: pos + step, ArrowUp: pos + step, Home: 0, End: 100 }[e.key];
		if (next === undefined) return;
		e.preventDefault();
		setPos(Math.min(100, Math.max(0, next)));
		markUsed();
	};

	if ((!today || !then) && !showSlots) return null; // production shows it only once both images exist

	return (
		<div
			ref={frameRef}
			className="relative aspect-[4/5] w-full cursor-ew-resize select-none overflow-hidden bg-[#e3d9c6] sm:aspect-[16/9]"
			style={{ touchAction: "pan-y" }}
			onPointerDown={(e) => {
				dragging.current = true;
				e.currentTarget.setPointerCapture?.(e.pointerId);
				moveTo(e.clientX);
				markUsed();
			}}
			onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
			onPointerUp={() => (dragging.current = false)}
			onPointerCancel={() => (dragging.current = false)}>
			<Layer image={then} slot="SLOT: the reconstruction, same angle as the photo. public/virtual/then-now/1790s.jpg, 2400x1350 or larger" />
			<div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
				<Layer image={today} slot="SLOT: the palace today, real photo. public/virtual/then-now/today.jpg, 2400x1350 or larger" muted />
			</div>

			<span className="pointer-events-none absolute bottom-4 left-4 font-instrument-serif text-lg italic text-white drop-shadow sm:text-xl">
				{labels.today}
			</span>
			<span className="pointer-events-none absolute bottom-4 right-4 font-instrument-serif text-lg italic text-white drop-shadow sm:text-xl">
				{labels.then}
			</span>

			<div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{ left: `${pos}%` }} />
			<div
				role="slider"
				tabIndex={0}
				aria-label={`Drag to compare: ${labels.today} and ${labels.then}`}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(pos)}
				onKeyDown={onKeyDown}
				className="absolute top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-[#2e1f16]/30 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
				style={{ left: `${pos}%` }}>
				<svg width="22" height="12" viewBox="0 0 20 12" fill="none" aria-hidden="true">
					<path d="M6 1L1 6l5 5M14 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			</div>
		</div>
	);
}

function Layer({ image, slot, muted = false }) {
	if (image) {
		return <Image src={image.src} alt={image.alt} fill sizes="100vw" draggable={false} className="object-cover" />;
	}
	return (
		<div className={`absolute inset-0 flex items-center justify-center p-8 text-center ${muted ? "bg-[#cfc3ad]" : "bg-[#e3d9c6]"}`}>
			<p className="max-w-sm font-mono text-xs leading-relaxed text-[#5c4636]">{slot}</p>
		</div>
	);
}
