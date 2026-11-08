// Site colour palettes, each split 60 / 30 / 10:
//   c60  the dominant colour — page backgrounds
//   c30  the secondary colour — type, the 3D models, and the inverted slabs
//   c10  the accent — buttons, highlights, one word in a headline
// `onAccent` is the text colour set on an accent button. `tone` says whether
// the 60 is light or dark. Everything else is mixed from these in app/globals.css.
export const PALETTES = [
	{ id: "charcoal-sand-blue", name: "Charcoal · Sand · Electric Blue", c60: "#1E1E1C", c30: "#D8CBB3", c10: "#2F6BFF", onAccent: "#FFFFFF", tone: "dark" },
	{ id: "navy-white-pink", name: "Navy · White · Hot Pink", c60: "#0F1B3D", c30: "#FFFFFF", c10: "#FF3D8B", onAccent: "#FFFFFF", tone: "dark" },
	{ id: "cream-ink-orange", name: "Cream · Ink Black · Burnt Orange", c60: "#F3EEE3", c30: "#111111", c10: "#D9541E", onAccent: "#FFFFFF", tone: "light" },
	{ id: "navy-cream-coral", name: "Navy · Cream · Coral", c60: "#14213D", c30: "#F4EDE0", c10: "#FF6B5B", onAccent: "#14213D", tone: "dark" },
	{ id: "midnight-white-lime", name: "Midnight · White · Lime", c60: "#0B0B0C", c30: "#FFFFFF", c10: "#C6F432", onAccent: "#0B0B0C", tone: "dark" },
];

export const DEFAULT_PALETTE = PALETTES[0];

export const paletteById = (id) => PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE;

// The page reads the palette from <html data-palette>, set before first paint by
// PALETTE_BOOT (from ?palette= or the last one picked) and changed by the switcher.
const listeners = new Set();
export const paletteStore = {
	get: () => (typeof document === "undefined" ? DEFAULT_PALETTE : paletteById(document.documentElement.dataset.palette)),
	getServer: () => DEFAULT_PALETTE,
	subscribe: (cb) => {
		listeners.add(cb);
		return () => listeners.delete(cb);
	},
	set: (id) => {
		const p = paletteById(id);
		const root = document.documentElement;
		root.dataset.palette = p.id;
		root.dataset.tone = p.tone;
		try {
			localStorage.setItem("palette", p.id);
		} catch {}
		const url = new URL(window.location.href);
		url.searchParams.set("palette", p.id);
		window.history.replaceState(window.history.state, "", url);
		listeners.forEach((cb) => cb());
	},
};

/** Inline <head> script: applies ?palette= (or the last pick) before the page paints. Not on epocheye.com. */
export const PALETTE_BOOT = `(function(){try{if(/(^|\\.)epocheye\\.com$/.test(location.hostname))return;var ids=${JSON.stringify(
	Object.fromEntries(PALETTES.map((p) => [p.id, p.tone])),
)};var q=new URLSearchParams(location.search).get("palette");var id=q||localStorage.getItem("palette");if(!ids[id])return;document.documentElement.dataset.palette=id;document.documentElement.dataset.tone=ids[id];}catch(e){}})();`;
