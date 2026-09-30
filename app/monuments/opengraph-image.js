import { ImageResponse } from "next/og";
import { ONE_LINER } from "@/lib/site";

export const alt = "Epocheye";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
				}}>
				<div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1 }}>Epocheye</div>
				<div style={{ fontSize: 46, lineHeight: 1.25, color: "rgba(255,255,255,0.85)", maxWidth: 1000 }}>
					{ONE_LINER}
				</div>
				<div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
					Bengaluru · Kolkata
				</div>
			</div>
		),
		size,
	);
}
