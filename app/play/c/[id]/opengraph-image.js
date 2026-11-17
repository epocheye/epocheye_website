import { ImageResponse } from "next/og";
import { readCard } from "@/lib/play/card.server";

// The share image of a card. Same plain style as app/opengraph-image.js. The site name, the line
// and both counts come from the pack's story; nothing here is written per site.

export const alt = "Epocheye Play: what you now know";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const frame = {
	width: "100%",
	height: "100%",
	display: "flex",
	flexDirection: "column",
	justifyContent: "space-between",
	padding: "64px 80px",
	background: "#0A0A0B",
	color: "#FFFFFF",
};
const small = { fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" };

export default async function CardImage({ params }) {
	const { id } = await params;
	const card = await readCard(id);
	if (!card) {
		// A card that cannot be read still gets a picture, never an error.
		return new ImageResponse(
			(
				<div style={frame}>
					<div style={{ display: "flex", fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>Epocheye Play</div>
					<div style={{ display: "flex", fontSize: 46, lineHeight: 1.25, color: "rgba(255,255,255,0.85)", maxWidth: 1000 }}>
						Rebuild a lost monument from its evidence.
					</div>
					<div style={{ display: "flex", ...small }}>A history game</div>
				</div>
			),
			size,
		);
	}
	const { view } = card;
	const line = view.shareLine || view.title || view.siteName;
	const learned = view.know.length;
	const open = view.unknown.length;
	return new ImageResponse(
		(
			<div style={frame}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
					<div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>Epocheye Play</div>
					<div style={{ display: "flex", ...small }}>{[view.siteName, view.place].filter(Boolean).join(" · ")}</div>
				</div>
				<div style={{ display: "flex", fontSize: line.length > 110 ? 44 : 54, lineHeight: 1.18, maxWidth: 1040, color: "rgba(255,255,255,0.92)" }}>{line}</div>
				<div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
					<div style={{ display: "flex", alignItems: "baseline" }}>
						<div style={{ display: "flex", fontSize: 112, fontWeight: 600, lineHeight: 1, letterSpacing: -4 }}>{String(learned)}</div>
						<div style={{ display: "flex", marginLeft: 20, fontSize: 30, color: "rgba(255,255,255,0.8)" }}>{learned === 1 ? "thing learned" : "things learned"}</div>
					</div>
					{open ? (
						<div style={{ display: "flex", ...small }}>{`${open} ${open === 1 ? "thing" : "things"} nobody knows`}</div>
					) : (
						<div style={{ display: "flex" }} />
					)}
				</div>
			</div>
		),
		size,
	);
}
