"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import Button from "./Button";

// One monument: the teaser render on first paint, its 6 second loop on hover or focus.
export default function MonumentCard({ monument, onReserve }) {
	const video = useRef(null);
	const [ready, setReady] = useState(false);
	const base = `/journeys/loops/${monument.object}`;

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
				<Image src={`/journeys/posters/${monument.object}.webp`} alt={monument.alt} fill sizes="(max-width: 767px) 100vw, 33vw" />
				<video ref={video} muted loop playsInline preload="none" aria-hidden="true" data-ready={ready ? "true" : "false"}>
					<source src={`${base}.webm`} type="video/webm" />
					<source src={`${base}.mp4`} type="video/mp4" />
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
