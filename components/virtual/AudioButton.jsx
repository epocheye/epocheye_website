"use client";

import { useRef, useState } from "react";
import { trackVirtual } from "./track";

// A narration sample. Plays only when pressed; never autoplays.
export default function AudioButton({ src, label, showSlots }) {
	const audio = useRef(null);
	const [playing, setPlaying] = useState(false);

	if (!src) {
		return showSlots ? (
			<p className="font-mono text-[11px] leading-relaxed text-[#f3e9d8]/60">
				SLOT: {label}, 20 to 30 s narration. public/virtual/audio/first-stop.mp3
			</p>
		) : null;
	}

	const toggle = () => {
		const el = audio.current;
		if (!el) return;
		if (el.paused) {
			el.play().catch(() => {});
			trackVirtual("virtual_audio_play");
		} else {
			el.pause();
		}
	};

	return (
		<div>
			<button
				type="button"
				onClick={toggle}
				aria-pressed={playing}
				className="group inline-flex items-center gap-3 font-instrument-sans text-base text-[#f3e9d8]">
				<span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4a85a] text-[#d4a85a] transition-colors duration-500 group-hover:bg-[#d4a85a] group-hover:text-[#0b0907]">
					{playing ? (
						<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
							<rect x="1" y="1" width="3.5" height="12" fill="currentColor" />
							<rect x="7.5" y="1" width="3.5" height="12" fill="currentColor" />
						</svg>
					) : (
						<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
							<path d="M1 1l10 6-10 6z" fill="currentColor" />
						</svg>
					)}
				</span>
				<span className="underline decoration-[#d4a85a]/50 underline-offset-4">{label}</span>
			</button>
			<audio ref={audio} src={src} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
		</div>
	);
}
