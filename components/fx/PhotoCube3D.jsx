"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

/**
 * Continuously rotating 3D photo cube — six monument faces on a preserve-3d
 * cube, spun by GSAP (reliable across engines) with a fixed forward tilt.
 * Pauses on hover; static angled pose under reduced-motion. `size` = edge px.
 */
export default function PhotoCube3D({ faces = [], size = 280, className = "" }) {
	const cubeRef = useRef(null);
	const h = size / 2;
	const transforms = [
		`translateZ(${h}px)`,
		`rotateY(180deg) translateZ(${h}px)`,
		`rotateY(90deg) translateZ(${h}px)`,
		`rotateY(-90deg) translateZ(${h}px)`,
		`rotateX(90deg) translateZ(${h}px)`,
		`rotateX(-90deg) translateZ(${h}px)`,
	];

	useGSAP(
		() => {
			const cube = cubeRef.current;
			if (!cube) return;
			gsap.set(cube, { transformStyle: "preserve-3d", rotationX: -16 });
			if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
				gsap.set(cube, { rotationY: -28 });
				return;
			}
			const tween = gsap.to(cube, {
				rotationY: "+=360",
				duration: 24,
				ease: "none",
				repeat: -1,
			});
			const pause = () => tween.pause();
			const play = () => tween.play();
			cube.addEventListener("pointerenter", pause);
			cube.addEventListener("pointerleave", play);
			return () => {
				tween.kill();
				cube.removeEventListener("pointerenter", pause);
				cube.removeEventListener("pointerleave", play);
			};
		},
		{ scope: cubeRef }
	);

	return (
		<div className={`relative ${className}`} style={{ width: size * 1.5, margin: "0 auto" }}>
			{/* glow halo */}
			<div
				aria-hidden="true"
				className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
				style={{
					width: size * 1.45,
					height: size * 1.45,
					background: "radial-gradient(circle, rgba(204,255,0,0.16), rgba(82,39,255,0.10) 40%, transparent 65%)",
					filter: "blur(24px)",
				}}
			/>
			<div className="persp" style={{ width: size, height: size, margin: "0 auto" }}>
				<div ref={cubeRef} className="relative h-full w-full" data-cursor style={{ transformStyle: "preserve-3d" }}>
					{transforms.map((t, i) => {
						const face = faces[i % faces.length];
						return (
							<div
								key={i}
								className="absolute inset-0 overflow-hidden border border-rule"
								style={{ transform: t, backfaceVisibility: "hidden" }}>
								<Image src={face.src} alt={face.label || ""} fill sizes="320px" className="object-cover" />
								<div className="absolute inset-0 bg-ink/20" />
								{face.label && (
									<span className="absolute bottom-2 left-2 mono-label text-[9px] text-bone">
										{face.label}
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
			{/* contact shadow */}
			<div
				aria-hidden="true"
				className="mx-auto pointer-events-none"
				style={{
					width: size * 0.78,
					height: 20,
					marginTop: size * 0.12,
					background: "radial-gradient(ellipse, rgba(0,0,0,0.65), transparent 70%)",
					filter: "blur(10px)",
				}}
			/>
		</div>
	);
}
