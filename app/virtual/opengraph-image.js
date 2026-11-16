import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Share card for Reddit / X: the hall, rendered from the 3D reconstruction in capture mode
// (/virtual?shot=shade&clean=1), with the page's title. No price, ever.
export const alt = "Tipu Sultan's Summer Palace, rebuilt: the hall, its galleries and cusped arches.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function VirtualOgImage() {
	// Static path so the bundler traces only this file.
	const buf = await readFile(path.join(process.cwd(), "public", "virtual", "share.jpg"));
	const src = `data:image/jpeg;base64,${buf.toString("base64")}`;
	const { width: W, height: H } = size;

	return new ImageResponse(
		(
			<div style={{ width: W, height: H, display: "flex", position: "relative", background: "#000" }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={src} width={W} height={H} style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }} alt="" />
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: W,
						height: H,
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						padding: "40px 48px",
						backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.85))",
						color: "#fff",
					}}>
					<div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>Epocheye</div>
					<div style={{ display: "flex", flexDirection: "column" }}>
						<div style={{ fontSize: 60, fontWeight: 600, lineHeight: 1.08 }}>Tipu Sultan&apos;s Summer Palace</div>
						<div style={{ marginTop: 10, fontSize: 32, color: "rgba(255,255,255,0.85)" }}>As it stood in the 1790s</div>
					</div>
				</div>
			</div>
		),
		size,
	);
}
