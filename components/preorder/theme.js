"use client";

import { createContext, useContext } from "react";

// Warm & approachable: terracotta, ochre, soft peach and deep espresso, the
// sandstone and fired-brick colours of the sites themselves. Laid out 60-30-10:
//   60  the ground   — soft peach (light) / deep espresso (dark)
//   30  structure    — espresso text and frames (light) / peach (dark)
//   10  action       — terracotta (buttons, selection); ochre marks the leader
// The 3D scene reads the palette from context, the DOM layer (HUD, fallback
// form) from the CSS variables in cssVars().
export const THEMES = {
	light: {
		mode: "light",
		bg: "#f3e4d5",
		paper: "#fffaf4",
		sand: "#dcbb9e",
		ink: "#2a1c15",
		accent: "#c4543a",
		accentText: "#a13d27",
		ochre: "#d99a2b",
		ochreText: "#9a6510",
		text: "#2a1c15",
		textSoft: "#4a372d",
		textMuted: "#735d50",
		points: "#3a2117",
		brick: "#c4543a",
		brickAlt: "#b0472f",
		error: "#b3261e",
		hemiSky: "#fff3e6",
		hemiGround: "#d9b99e",
		sun: "#ffe9d2",
		sunIntensity: 1.8,
		bloom: 0.25,
		bloomThreshold: 0.95,
		additive: false,
	},
	dark: {
		mode: "dark",
		bg: "#1a120e",
		paper: "#f4e4d6",
		sand: "#3a2a22",
		ink: "#f4e4d6",
		accent: "#e2674b",
		accentText: "#f08a70",
		ochre: "#e8a93a",
		ochreText: "#f0bf63",
		text: "#f4e4d6",
		textSoft: "#cdb7a6",
		textMuted: "#8f786a",
		points: "#f1c9a8",
		brick: "#c95a3f",
		brickAlt: "#b24a32",
		error: "#ff8a7a",
		hemiSky: "#6b4a3a",
		hemiGround: "#120c09",
		sun: "#ffd9b8",
		sunIntensity: 1.3,
		bloom: 0.5,
		bloomThreshold: 0.75,
		additive: true,
	},
};

export const ThemeContext = createContext(THEMES.light);
export const usePalette = () => useContext(ThemeContext);

const mix = (hex, pct) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

/** CSS variables for the DOM layer; set on the page root. */
export function cssVars(t) {
	return {
		"--pa-bg": t.bg,
		"--pa-panel": t.mode === "light" ? t.paper : "#241912",
		"--pa-accent": t.accent,
		"--pa-accent-text": t.accentText,
		"--pa-accent-glow": mix(t.accent, 40),
		"--pa-ochre": t.ochre,
		"--pa-ochre-text": t.ochreText,
		"--pa-ochre-glow": mix(t.ochre, 45),
		"--pa-text": t.text,
		"--pa-text-soft": t.textSoft,
		"--pa-text-muted": t.textMuted,
		"--pa-line": mix(t.text, 18),
		"--pa-error": t.error,
		// Frosted glass for the DOM controls and panels over the scene.
		"--pa-glass": mix(t.mode === "light" ? "#fffaf4" : "#2a1d16", t.mode === "light" ? 72 : 60),
		"--pa-glass-strong": mix(t.mode === "light" ? "#fffaf4" : "#2a1d16", t.mode === "light" ? 88 : 82),
		// On the light peach ground a white rim vanishes, so light glass gets a warm edge and a deeper shadow.
		"--pa-glass-line": t.mode === "light" ? "rgba(122, 74, 46, 0.2)" : "rgba(255, 240, 228, 0.14)",
		"--pa-glass-shadow":
			t.mode === "light"
				? "0 12px 36px -10px rgba(90, 52, 30, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.9)"
				: "0 10px 40px -12px rgba(0, 0, 0, 0.6)",
		colorScheme: t.mode,
	};
}

export const THEME_KEY = "epocheye-preorder-theme";

/** Saved choice, else the system setting. Client only. */
export function initialTheme() {
	try {
		const saved = localStorage.getItem(THEME_KEY);
		if (saved === "light" || saved === "dark") return saved;
	} catch {
		// storage blocked: fall through to the system setting
	}
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 3D text (troika needs .woff). The DOM layer uses the same faces through
// next/font in app/preorder/fonts.js. The two Rajdhani files also carry ₹
// (U+20B9, merged in from Rajdhani's Devanagari subset) for prices in India;
// Share Tech Mono has no ₹, so prices are never set in mono.
export const FONTS = {
	display: "/fonts/preorder/rajdhani-latin-700-normal.woff",
	body: "/fonts/preorder/rajdhani-latin-500-normal.woff",
	mono: "/fonts/preorder/share-tech-mono-latin-400-normal.woff",
};

// Rajdhani is narrow and sets small for its size; scale it up so layouts tuned
// in world units keep their visual weight.
export const FONT_SCALE = { display: 1.2, body: 1.15, mono: 1 };
