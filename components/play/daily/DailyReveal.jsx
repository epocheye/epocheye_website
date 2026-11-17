"use client";

// The answer to "where does it belong", shown afterwards: one 512 px face of the viewpoint that
// sees the piece, NOW outside the restoration's own mask and THEN inside it, so the lost part
// shows in place. A switch puts the plain NOW face back for comparison. Drawn on a canvas because
// the masks are greyscale images, which CSS masking reads as alpha in some browsers.

import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/play/ui";

function load(src) {
	return new Promise((resolve, reject) => {
		const img = new window.Image();
		img.decoding = "async";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`could not load ${src}`));
		img.src = src;
	});
}

const SIZE = 512;
const DIM = 0.55; // how dark the rest of the view goes, so the restored part stands out

export default function DailyReveal({ reveal, name }) {
	const canvasRef = useRef(null);
	const layersRef = useRef(null);
	const [state, setState] = useState("loading");
	const [restored, setRestored] = useState(true);

	useEffect(() => {
		let live = true;
		layersRef.current = null;
		Promise.all([load(reveal.now), load(reveal.then), load(reveal.mask)])
			.then(([now, then, mask]) => {
				if (!live) return;
				const layer = () => {
					const c = document.createElement("canvas");
					c.width = SIZE;
					c.height = SIZE;
					return c;
				};
				const nowC = layer();
				nowC.getContext("2d").drawImage(now, 0, 0, SIZE, SIZE);
				const thenC = layer();
				thenC.getContext("2d").drawImage(then, 0, 0, SIZE, SIZE);
				const maskC = layer();
				const faceW = mask.naturalWidth / (reveal.faces || 6);
				maskC.getContext("2d").drawImage(mask, faceW * reveal.faceIndex, 0, faceW, mask.naturalHeight, 0, 0, SIZE, SIZE);
				const n = nowC.getContext("2d").getImageData(0, 0, SIZE, SIZE);
				const t = thenC.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
				const m = maskC.getContext("2d").getImageData(0, 0, SIZE, SIZE).data;
				const out = new ImageData(SIZE, SIZE);
				const o = out.data;
				const d = n.data;
				for (let i = 0; i < d.length; i += 4) {
					const a = m[i] / 255;
					const rest = (1 - a) * DIM;
					o[i] = t[i] * a + d[i] * rest;
					o[i + 1] = t[i + 1] * a + d[i + 1] * rest;
					o[i + 2] = t[i + 2] * a + d[i + 2] * rest;
					o[i + 3] = 255;
				}
				const restC = layer();
				restC.getContext("2d").putImageData(out, 0, 0);
				layersRef.current = { now: nowC, restored: restC };
				setState("ready");
			})
			.catch(() => {
				if (live) setState("failed");
			});
		return () => {
			live = false;
		};
	}, [reveal.now, reveal.then, reveal.mask, reveal.faceIndex, reveal.faces]);

	useEffect(() => {
		const layers = layersRef.current;
		const canvas = canvasRef.current;
		if (state !== "ready" || !layers || !canvas) return;
		canvas.getContext("2d").drawImage(restored ? layers.restored : layers.now, 0, 0);
	}, [state, restored]);

	if (state === "failed") return null;

	const label = restored ? `${name}, restored in place, seen from ${reveal.name}` : `${reveal.name} today`;
	return (
		<figure className="play-daily-reveal">
			<div className="play-daily-reveal-frame">
				<canvas
					ref={canvasRef}
					width={SIZE}
					height={SIZE}
					className={`play-daily-reveal-canvas${state === "ready" ? " is-ready" : ""}`}
					role="img"
					aria-label={label}
				/>
			</div>
			<figcaption className="play-daily-reveal-cap">
				<span className="play-note">{`Seen from ${reveal.name}`}</span>
				<Switch label="Restored" on={restored} onChange={setRestored} compact />
			</figcaption>
		</figure>
	);
}
