"use client";

import { useRef, useState } from "react";

import { assetUrl } from "@/lib/journeys/config";
import Button from "./Button";

// One monument: the teaser render on first paint, its 6 second loop on hover or focus.
export default function MonumentCard({ monument, onReserve }) {
	const video = useRef(null);
	const [ready, setReady] = useState(false);
	const base = `/journeys/loops/${monument.object}`;
	const poster = assetUrl(`/journeys/posters/${monument.object}.webp`);

	function play() {
		const v = video.current;
		if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (!v.src && !v.querySelector("source")) return;
		v.play().then(() => setReady(true)).catch(() => {});
	}

	function pause() {
		video.current?.pause();
	}

	return (
		<li className="jr-card" onMouseEnter={play} onMouseLeave={pause} onFocus={play} onBlur={pause}>
			<div className="jr-card__media">
				{/* Plain img: versioned query strings are not allowed through next/image for local files. */}
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={poster} alt={monument.alt} width={1600} height={1600} loading="lazy" decoding="async" />
				<video ref={video} muted loop playsInline preload="none" aria-hidden="true" data-ready={ready ? "true" : "false"}>
					<source src={assetUrl(`${base}.webm`)} type="video/webm" />
					<source src={assetUrl(`${base}.mp4`)} type="video/mp4" />
				</video>
			</div>
			<h3 className="jr-card__name">{monument.name}</h3>
			<p className="jr-card__meta">
				{monument.city}
				<br />
				{monument.era}
				<br />
				<span className="jr-card__opens">Opens {monument.opens}</span>
			</p>
			<div className="jr-card__cta">
				<Button small onClick={() => onReserve("card", monument.slug)}>
					Reserve
				</Button>
			</div>
		</li>
	);
}
