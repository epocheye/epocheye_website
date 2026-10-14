import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

import { RECONSTRUCTION, TODAY } from "@/lib/virtual/images";

// Share card for Reddit / X: the reveal frozen at the midpoint. No price, ever.
export const alt = "Tipu Sultan's Summer Palace: today on the left, reconstructed as it stood in the 1790s on the right.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function dataUrl(file) {
	const buf = await readFile(path.join(process.cwd(), file));
	return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

export default async function VirtualOgImage() {
	const [today, recon] = await Promise.all([dataUrl(TODAY.file), dataUrl(RECONSTRUCTION.file)]);
	const W = size.width;
	const H = size.height;
	const pill = {
		position: "absolute",
		top: 28,
		padding: "8px 18px",
		borderRadius: 999,
		border: "1px solid rgba(255,255,255,0.35)",
		background: "rgba(0,0,0,0.55)",
		color: "#fff",
		fontSize: 20,
		letterSpacing: 3,
		textTransform: "uppercase",
	};

	return new ImageResponse(
		(
			<div style={{ width: W, height: H, display: "flex", position: "relative", background: "#080808" }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={recon} width={W} height={H} style={{ position: "absolute", inset: 0, objectFit: "cover" }} alt="" />
				<div style={{ position: "absolute", top: 0, left: 0, width: W / 2, height: H, display: "flex", overflow: "hidden" }}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={today} width={W} height={H} style={{ objectFit: "cover" }} alt="" />
				</div>
				<div style={{ position: "absolute", top: 0, left: W / 2 - 2, width: 4, height: H, background: "#fff" }} />
				<div
					style={{
						position: "absolute",
						top: H / 2 - 32,
						left: W / 2 - 32,
						width: 64,
						height: 64,
						borderRadius: 999,
						border: "3px solid #fff",
						background: "rgba(0,0,0,0.5)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}>
					<svg width="30" height="18" viewBox="0 0 20 12" fill="none">
						<path d="M6 1L1 6l5 5M14 1l5 5-5 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>
				<div style={{ ...pill, left: 28, display: "flex" }}>{TODAY.label}</div>
				<div style={{ ...pill, right: 28, display: "flex" }}>{RECONSTRUCTION.label}</div>
				<div
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 0,
						height: 190,
						padding: "0 40px 30px",
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
						background: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.85))",
						color: "#fff",
					}}>
					<div style={{ fontSize: 46, fontWeight: 600, lineHeight: 1.1 }}>Tipu Sultan&apos;s Summer Palace</div>
					<div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 28, color: "rgba(255,255,255,0.8)" }}>
						<span>As it stood in the 1790s</span>
						<span style={{ fontWeight: 600, color: "#fff" }}>Epocheye</span>
					</div>
				</div>
			</div>
		),
		size,
	);
}
