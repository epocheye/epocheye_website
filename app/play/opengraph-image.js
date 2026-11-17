import { ImageResponse } from "next/og";

// The share picture of every Play page except a player's card (app/play/c/[id] has its own).
// Same plain style as app/opengraph-image.js. Copy rules: no dashes, no prices, no counts.

export const alt = "Epocheye Play: rebuild a lost monument from its evidence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function PlayImage() {
	return new ImageResponse(
		(
			<div
				style={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "72px 80px",
					background: "#0A0A0B",
					color: "#FFFFFF",
				}}
			>
				<div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>Epocheye Play</div>
				<div style={{ display: "flex", fontSize: 58, lineHeight: 1.18, color: "rgba(255,255,255,0.9)", maxWidth: 1000 }}>
					Rebuild a lost monument from its evidence.
				</div>
				<div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>A history game</div>
			</div>
		),
		size,
	);
}
