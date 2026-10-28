"use client";

import { createContext, useContext } from "react";

// Electric blue and amber. Blue is the brand colour and holds up on both
// backgrounds; amber is the light: the scan beam, the leader, what to look at.
// The 3D scene reads the palette from context, the DOM layer (HUD, form) from
// the CSS variables in cssVars().
export const THEMES = {
	dark: {
		mode: "dark",
		bg: "#05070d",
		panel: "#0a0f1f",
		grid: "#1c2c5c",
		blue: "#2f6bff",
		blueText: "#8fb0ff",
		amber: "#ffb020",
		amberText: "#ffc75a",
		text: "#eef2ff",
		textSoft: "#b6c0dc",
		textMuted: "#6b7698",
		points: "#4d82ff",
		error: "#ff8a8a",
		bloom: 1.0,
		bloomThreshold: 0.5,
		additive: true,
	},
	light: {
		mode: "light",
		bg: "#eef1f7",
		panel: "#ffffff",
		grid: "#b9c4e0",
		blue: "#2457f5",
		blueText: "#2457f5",
		amber: "#ff9f0a",
		amberText: "#b46400",
		text: "#0b1022",
		textSoft: "#3a4566",
		textMuted: "#7b85a3",
		points: "#1d46d6",
		error: "#c62828",
		bloom: 0.4,
		bloomThreshold: 0.9,
		additive: false,
	},
};

export const ThemeContext = createContext(THEMES.dark);
export const usePalette = () => useContext(ThemeContext);

const mix = (hex, pct) => `color-mix(in srgb, ${hex} ${pct}%, transparent)`;

/** CSS variables for the DOM layer; set on the page root. */
export function cssVars(t) {
	return {
		"--pa-bg": t.bg,
		"--pa-panel": t.panel,
		"--pa-blue": t.blue,
		"--pa-blue-text": t.blueText,
		"--pa-blue-glow": mix(t.blue, 45),
		"--pa-amber": t.amber,
		"--pa-amber-text": t.amberText,
		"--pa-amber-glow": mix(t.amber, 55),
		"--pa-text": t.text,
		"--pa-text-soft": t.textSoft,
		"--pa-text-muted": t.textMuted,
		"--pa-line": mix(t.text, 16),
		"--pa-error": t.error,
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
	return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export const FONTS = {
	display: "/fonts/preorder/montserrat-alternates-latin-600-normal.woff",
	body: "/fonts/preorder/montserrat-alternates-latin-400-normal.woff",
	mono: "/fonts/preorder/geist-mono-latin-400-normal.woff",
};
