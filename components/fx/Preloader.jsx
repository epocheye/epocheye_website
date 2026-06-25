"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

/**
 * One-shot intro preloader: a void-black curtain with the wordmark and a 0→100
 * counter, then a 3D curtain lift (rotateX + slide) that reveals the page.
 * Runs once on load; removes itself from the flow afterward. Under reduced-motion
 * it disappears instantly.
 */
export default function Preloader() {
	const rootRef = useRef(null);
	const numRef = useRef(null);
	const barRef = useRef(null);

	useGSAP(
		() => {
			const root = rootRef.current;
			if (!root) return;
			const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
			if (reduced) {
				gsap.set(root, { display: "none" });
				return;
			}

			document.body.style.overflow = "hidden";
			const counter = { v: 0 };
			const tl = gsap.timeline({
				onComplete: () => {
					document.body.style.overflow = "";
					gsap.set(root, { display: "none" });
				},
			});

			tl.to(counter, {
				v: 100,
				duration: 1.5,
				ease: "power2.inOut",
				onUpdate: () => {
					const n = Math.round(counter.v);
					if (numRef.current) numRef.current.textContent = String(n).padStart(3, "0");
					if (barRef.current) barRef.current.style.transform = `scaleX(${counter.v / 100})`;
				},
			})
				.to(".pl-fade", { opacity: 0, duration: 0.4, ease: "power2.out" }, "+=0.15")
				.set(root, { transformPerspective: 1200, transformOrigin: "center top" })
				.to(root, { rotationX: 28, yPercent: -100, duration: 0.9, ease: "power3.inOut" }, "-=0.1");
		},
		{ scope: rootRef }
	);

	return (
		<div
			ref={rootRef}
			className="fixed inset-0 z-[10000] bg-ink flex flex-col items-center justify-center will-change-transform">
			<div className="pl-fade flex flex-col items-center gap-6">
				<span className="mono-label text-xs text-bone-muted">Epocheye</span>
				<span
					ref={numRef}
					className="font-serif text-bone glow-signal leading-none"
					style={{ fontSize: "clamp(80px, 16vw, 220px)" }}>
					000
				</span>
				<div className="relative h-px w-48 bg-rule overflow-hidden">
					<div
						ref={barRef}
						className="absolute inset-0 origin-left bg-signal"
						style={{ transform: "scaleX(0)" }}
					/>
				</div>
				<span className="mono-label text-[10px] text-bone-faint">Loading the past</span>
			</div>
		</div>
	);
}
