"use client";

import { createContext, useContext } from "react";

export { THEME_KEY } from "./themeScript";

// Colours for the 3D scene; the DOM reads the same palette from the CSS
// variables in app/preorder/preorder.css. Night is the default; day swaps
// the sky for parchment and the starlight for ink.
export const THEMES = {
	dark: {
		mode: "dark",
		bg: "#14120d",
		ink: "#efe9d9",
		dim: "#8b8574",
		glow: "#ffd9a0",
		points: "#efe9d9",
		accent: "#d9c7a0",
		additive: true,
	},
	light: {
		mode: "light",
		bg: "#efe9d9",
		ink: "#1d1a14",
		dim: "#7d7766",
		glow: "#9a6a2a",
		points: "#1d1a14",
		accent: "#7a5f30",
		additive: false,
	},
};

/** The theme the page script picked, once on the client. */
export function currentTheme() {
	return document.documentElement.dataset.paTheme === "light" ? "light" : "dark";
}

export const ThemeContext = createContext(THEMES.dark);
export const usePalette = () => useContext(ThemeContext);
