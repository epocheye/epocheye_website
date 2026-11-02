// The homepage scene in the main site's palette: void black, bone type and one
// electric signal accent (app/globals.css). The shared hologram pieces in
// components/preorder/Holo.jsx read their colours from the same keys.
export const PALETTE = {
	mode: "dark",
	bg: "#0A0A0B",
	bg2: "#0E0E10",
	ink: "#F2EFE6",
	text: "#F2EFE6",
	textSoft: "#C9C6BC",
	textMuted: "#8A887F",
	textFaint: "#55534B",
	ghost: "#1B1B19",
	side: "#2A2A27",
	accent: "#CCFF00",
	accentText: "#CCFF00",
	ochre: "#F2EFE6",
	sand: "#2E2E2B",
	points: "#F2EFE6",
	hemiSky: "#3a3a36",
	hemiGround: "#050505",
	sun: "#ffffff",
	sunIntensity: 1.2,
	bloom: 0.45,
	bloomThreshold: 0.8,
	additive: true,
};

// 3D type needs .woff (troika). Same faces as the DOM: Instrument Serif for
// display, Geist Mono for labels and copy.
export const FONTS = {
	serif: "/fonts/home/instrument-serif-latin-400-normal.woff",
	italic: "/fonts/home/instrument-serif-latin-400-italic.woff",
	mono: "/fonts/home/geist-mono-latin-400-normal.woff",
	monoBold: "/fonts/home/geist-mono-latin-500-normal.woff",
};
