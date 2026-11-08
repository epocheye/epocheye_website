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
				{index}. {palette.name}
			</p>
			<div className="flex gap-1.5" role="group" aria-label="Colour palette">
				{PALETTES.map((p, i) => (
					<button
						key={p.id}
						type="button"
						onClick={() => paletteStore.set(p.id)}
						aria-pressed={palette.id === p.id}
						aria-label={`${i}. ${p.name}`}
						title={`${i}. ${p.name}`}
						className={`relative flex overflow-hidden rounded-md border-2 transition-transform ${palette.id === p.id ? "scale-110 border-white" : "border-white/20 hover:border-white/60"}`}>
						{[p.ink, p.bone, p.signal].map((c) => (
							<span key={c} className="h-6 w-2.5" style={{ background: c }} />
						))}
						<span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] leading-3">{i}</span>
					</button>
				))}
			</div>
		</div>
	);
}
