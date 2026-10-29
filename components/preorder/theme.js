"use client";

import { createContext, useContext } from "react";

export { THEME_KEY } from "./themeScript";

// Colours for the 3D scene; the DOM reads the same palette from the CSS
// variables in app/preorder/preorder.css. Dark is the default: the temple is
// drawn in soft white light on near-black, with electric blue for the scan.
export const THEMES = {
	dark: {
		mode: "dark",
		bg: "#0b0b0d",
		points: "#e5e5ea",
		accent: "#4c82ff",
		line: "#ffffff",
		additive: true,
	},
	light: {
		mode: "light",
		bg: "#fafafa",
		points: "#1c1c1e",
		accent: "#2f6bff",
		line: "#1c1c1e",
		additive: false,
	},
};

/** The theme the page script picked, once on the client. */
export function currentTheme() {
	return document.documentElement.dataset.paTheme === "light" ? "light" : "dark";
}

export const ThemeContext = createContext(THEMES.dark);
export const usePalette = () => useContext(ThemeContext);
