"use client";

import { useEffect, useRef } from "react";
import { trackVirtual } from "./track";

// Loads nothing until it first scrolls into view (preload="none"), so the hero stays fast
// on phones; then it starts and keeps looping. Pausing it again on scroll-out aborted the
// half-loaded download in Chromium and left later play() calls hanging, so it is not paused.
// Fires virtual_story_view once, when it starts.
export default function StoryVideo({ video }) {
	const ref = useRef(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return undefined;

		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				io.disconnect();
				el.play()
					.then(() => trackVirtual("virtual_story_view"))
					.catch(() => {});
			},
			{ threshold: 0.4 },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	return (
		<video
			ref={ref}
			className="aspect-square w-full rounded-3xl border border-white/20 bg-black object-cover"
			muted
			loop
			playsInline
			preload="none"
			poster={video.poster}
			aria-label={video.label}>
			<source src={video.webm} type="video/webm" />
			<source src={video.mp4} type="video/mp4" />
		</video>
	);
}
