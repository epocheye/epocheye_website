import localFont from "next/font/local";

// /preorder's type: Rajdhani (Indian Type Foundry) for display and body, Share
// Tech Mono for HUD labels. The 3D text loads the .woff copies in
// public/fonts/preorder (see components/preorder/theme.js FONTS).
export const rajdhani = localFont({
	src: [
		{ path: "./fonts/rajdhani-latin-500-normal.woff2", weight: "500" },
		{ path: "./fonts/rajdhani-latin-600-normal.woff2", weight: "600" },
		{ path: "./fonts/rajdhani-latin-700-normal.woff2", weight: "700" },
	],
	variable: "--font-pre-display",
	display: "swap",
});

export const shareTechMono = localFont({
	src: "./fonts/share-tech-mono-latin-400-normal.woff2",
	weight: "400",
	variable: "--font-pre-mono",
	display: "swap",
});
