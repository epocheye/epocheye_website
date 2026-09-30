import { ImageResponse } from "next/og";
import { MONUMENTS, getMonument } from "@/lib/monuments";

export const alt = "Epocheye monument page";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
	return MONUMENTS.map((m) => ({ slug: m.slug }));
}

export default async function MonumentOgImage({ params }) {
	const { slug } = await params;
	const m = getMonument(slug);
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
				<div style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
					{m ? `${m.city} · ${m.region}` : "Epocheye"}
				</div>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05 }}>{m?.name ?? "Epocheye"}</div>
					<div style={{ fontSize: 34, marginTop: 28, color: "rgba(255,255,255,0.75)" }}>
						What survives, what is gone, and what no source records.
					</div>
				</div>
				<div style={{ fontSize: 30, fontWeight: 600 }}>Epocheye</div>
			</div>
		),
		size,
	);
}
