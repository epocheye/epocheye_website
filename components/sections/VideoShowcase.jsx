"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import KineticText from "@/components/fx/KineticText";

/**
 * Cinematic full-bleed video band — real AR prototype footage. Unlike the
 * GPU/JS effects, autoplay video plays on every device (and isn't suppressed by
 * reduce-motion), so this guarantees a visible, beautiful motion moment.
 * Mounts the <video> only when scrolled near, to save bandwidth.
 */
export default function VideoShowcase() {
	const ref = useRef(null);
	const inView = useInView(ref, { margin: "300px 0px" });

	return (
		<section
			ref={ref}
			className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden bg-ink">
			<div className="absolute inset-0" aria-hidden="true">
				{inView ? (
					<video
						src="/shot2.mp4"
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						className="h-full w-full object-cover"
					/>
				) : (
					<div className="h-full w-full bg-ink-2" />
				)}
				<div className="absolute inset-0 bg-ink/70" />
				<div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
			</div>

			<div className="relative z-10 px-6 text-center">
				<span className="mono-label text-xs text-signal">{"// In the field"}</span>
				<KineticText
					text={"Heritage,\nin motion."}
					as="h2"
					split="char"
					className="font-serif text-bone mt-5 glow-signal kin-spaced"
					style={{ fontSize: "clamp(40px, 8vw, 120px)", lineHeight: 0.96 }}
				/>
				<p className="font-mono text-sm text-bone-muted max-w-md mx-auto mt-6">
					Real footage from the Epocheye AR prototype — point, and the past renders in place.
				</p>
			</div>
		</section>
	);
}
