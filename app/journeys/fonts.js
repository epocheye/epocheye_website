// Type for /journeys only. Hanken Grotesk (Hanken Design Co., SIL OFL 1.1, variable 300..700)
// self-hosted from public/fonts/hanken-grotesk/ as the stand-in for Magnetik until a web
// licence is bought. To swap: see JOURNEYS.md "Swap fonts".
import localFont from "next/font/local";

export const journeysFont = localFont({
	src: [
		{ path: "../../public/fonts/hanken-grotesk/HankenGrotesk-latin.woff2", weight: "300 700", style: "normal" },
		{ path: "../../public/fonts/hanken-grotesk/HankenGrotesk-latin-ext.woff2", weight: "300 700", style: "normal" },
	],
	display: "swap",
	variable: "--jr-font",
	preload: true,
});
