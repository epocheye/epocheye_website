// Site colour palettes. Each one is three colours: `ink` (the page), `bone`
// (the type and the point cloud) and `signal` (the one accent). Everything else
// — muted type, hairlines, glows — is mixed from these in app/globals.css.
// `tone: "light"` palettes put dark type on a light page.
export const PALETTES = [
	{ id: "current", name: "Current", ink: "#0A0A0B", bone: "#F2EFE6", signal: "#CCFF00", tone: "dark" },
	{ id: "charcoal-sand-blue", name: "Charcoal · Sand · Electric Blue", ink: "#1E1E1C", bone: "#D8CBB3", signal: "#2F6BFF", tone: "dark" },
	{ id: "navy-white-pink", name: "Navy · White · Hot Pink", ink: "#0F1B3D", bone: "#FFFFFF", signal: "#FF3D8B", tone: "dark" },
	{ id: "cream-ink-orange", name: "Cream · Ink Black · Burnt Orange", ink: "#F3EEE3", bone: "#111111", signal: "#D9541E", tone: "light" },
	{ id: "navy-cream-coral", name: "Navy · Cream · Coral", ink: "#14213D", bone: "#F4EDE0", signal: "#FF6B5B", tone: "dark" },
	{ id: "midnight-white-lime", name: "Midnight · White · Lime", ink: "#0B0B0C", bone: "#FFFFFF", signal: "#C6F432", tone: "dark" },
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

/** Inline <head> script: applies ?palette= (or the last pick) before the page paints. */
export const PALETTE_BOOT = `(function(){try{if(/(^|\\.)epocheye\\.com$/.test(location.hostname))return;var ids=${JSON.stringify(
	Object.fromEntries(PALETTES.map((p) => [p.id, p.tone])),
)};var q=new URLSearchParams(location.search).get("palette");var id=q||localStorage.getItem("palette");if(!ids[id])return;document.documentElement.dataset.palette=id;document.documentElement.dataset.tone=ids[id];}catch(e){}})();`;
