// Type for /journeys only. The reference sets everything in Magnetik (Hanken Design Co.):
// uppercase display at 600, tracking -0.03em, line-height 1. Magnetik needs a web licence, so
// until the files are in public/fonts/magnetik/ the page uses Archivo (SIL OFL, Omnibus-Type),
// a wide-stance grotesk with the same squarish rounds, self-hosted as a variable font with
// width and weight axes. To swap: see JOURNEYS.md "Swap fonts".
import localFont from "next/font/local";

export const journeysFont = localFont({
	src: [
		// Latin only: the page is English, and every src entry here is preloaded.
		{ path: "../../public/fonts/archivo/Archivo-latin.woff2", weight: "100 900", style: "normal" },
	],
	declarations: [{ prop: "font-stretch", value: "62% 125%" }],
	display: "swap",
	variable: "--jr-font",
	preload: true,
});
