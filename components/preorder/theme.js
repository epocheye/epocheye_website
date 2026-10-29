"use client";

import { createContext, useContext } from "react";

export { THEME_KEY } from "./themeScript";

// Colours for the 3D stages; the DOM reads the same palette from the CSS
// variables in app/preorder/preorder.css. Clean and minimal: white (or near
// black), charcoal hardware, and electric blue only where it leads.
export const THEMES = {
	light: {
		mode: "light",
		phone: "#1c1c1e",
		phoneEdge: "#3a3a3c",
		accent: "#2f6bff",
		bar: "#d8d8de",
		barHover: "#b9b9c2",
		points: "#1c1c1e",
		additive: false,
		shadow: 0.32,
	},
	dark: {
		mode: "dark",
		phone: "#3a3a3d",
		phoneEdge: "#48484a",
		accent: "#4c82ff",
		bar: "#5a5a60",
		barHover: "#77777e",
		points: "#e5e5ea",
		additive: true,
		shadow: 0.7,
	},
};

/** The theme the page script picked, once on the client. */
export function currentTheme() {
	return document.documentElement.dataset.paTheme === "dark" ? "dark" : "light";
}

export const ThemeContext = createContext(THEMES.light);
export const usePalette = () => useContext(ThemeContext);
