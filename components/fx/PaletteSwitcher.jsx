"use client";

import { useSyncExternalStore } from "react";
import { PALETTES, paletteStore } from "@/lib/palettes";

const subscribeNoop = () => () => {};

/**
 * Preview-only palette picker: a small bar of numbered swatches, bottom-left.
 * Never shown on epocheye.com; on previews it lets each palette be compared live.
 */
export default function PaletteSwitcher() {
	const preview = useSyncExternalStore(
		subscribeNoop,
		() => !/(^|\.)epocheye\.com$/.test(window.location.hostname),
		() => false,
	);
	const palette = useSyncExternalStore(paletteStore.subscribe, paletteStore.get, paletteStore.getServer);
	if (!preview) return null;

	const index = PALETTES.indexOf(palette);
	return (
		<div className="fixed bottom-3 left-3 z-[10001] rounded-xl border border-white/15 bg-black/85 px-2.5 py-2 font-mono text-[10px] text-white shadow-2xl backdrop-blur-md">
			<p className="mb-1.5 max-w-[15rem] truncate uppercase tracking-[0.14em] text-white/70">
				{index + 1}. {palette.name} · 60/30/10
			</p>
			<div className="flex gap-1.5" role="group" aria-label="Colour palette">
				{PALETTES.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => paletteStore.set(p.id)}
						aria-pressed={palette.id === p.id}
						aria-label={`${i + 1}. ${p.name}`}
						title={`${i + 1}. ${p.name}`}
						className={`relative flex overflow-hidden rounded-md border-2 transition-transform ${palette.id === p.id ? "scale-110 border-white" : "border-white/20 hover:border-white/60"}`}>
						{/* The palette at its proportions: 60 / 30 / 10. */}
						{[
							[p.c60, 18],
							[p.c30, 9],
							[p.c10, 4],
						].map(([c, w]) => (
							<span key={c} className="h-7" style={{ background: c, width: w }} />
						))}
						<span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] leading-3">{i + 1}</span>
					</button>
				))}
			</div>
		</div>
	);
}
