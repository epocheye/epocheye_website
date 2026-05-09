"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

gsap.registerPlugin(ScrollTrigger);

const SolutionSplit = () => {
	const sectionRef = useRef(null);
	const textRef = useRef(null);
	const videoRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		const textContainer = textRef.current;
		const videoContainer = videoRef.current;

		if (!section || !textContainer || !videoContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsInView(true);
						observer.unobserve(section);
					}
				});
			},
			{ threshold: 0.1, rootMargin: "0px" },
		);

		observer.observe(section);

		const ctx = gsap.context(() => {
			const lines = textContainer.querySelectorAll(".headline-line");

			gsap.set(lines, { opacity: 0, x: -50 });
			gsap.to(lines, {
				opacity: 1,
				x: 0,
				duration: 1,
				stagger: 0.1,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					toggleActions: "play none none reverse",
				},
			});

			gsap.set(videoContainer, { opacity: 0, scale: 0.94 });
			gsap.to(videoContainer, {
				opacity: 1,
				scale: 1,
				duration: 1.2,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					toggleActions: "play none none reverse",
				},
			});

			gsap.to(videoContainer, {
				yPercent: -8,
				ease: "none",
				scrollTrigger: {
					trigger: section,
					start: "top bottom",
					end: "bottom top",
					scrub: 0.5,
				},
			});
		}, section);

		return () => {
			ctx.revert();
			observer.disconnect();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative min-h-screen overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<DarkBeamsBackground
				opacity={0.24}
				scrimOpacity={0.52}
				beamProps={{ beamNumber: 9, speed: 0.55, rotation: -12 }}
			/>

			{/* Dot grid background */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.025]"
				style={{
					backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
					backgroundSize: "32px 32px",
				}}
			/>

			{/* Ambient glow */}
			<div className="absolute top-1/3 -left-1/4 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] bg-white/2 rounded-full blur-[120px] pointer-events-none" />

			<div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
				{/* Left Column */}
				<div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start px-6 sm:px-10 lg:px-16 xl:px-24 py-16 lg:py-0 min-h-[50vh] lg:min-h-screen">
					<div ref={textRef} className="max-w-[560px]">
						{/* Label pill */}
						<span className="headline-line inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/40 border border-white/10 rounded-full uppercase mb-8">
							The Product
						</span>

						{/* Headline */}
						<h2 className="headline-line font-instrument-serif font-light text-white leading-[1.1] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl mb-2">
							We Reconstruct
						</h2>
						<h2 className="headline-line font-instrument-serif font-bold text-white leading-[1.1] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl mb-2">
							History
						</h2>
						<h2 className="headline-line font-instrument-serif font-light text-white/70 leading-[1.1] text-3xl sm:text-4xl lg:text-5xl xl:text-6xl">
							In The Real World.
						</h2>

						{/* Subtext */}
						<p className="headline-line mt-8 text-white/58 text-base sm:text-lg font-light leading-relaxed max-w-[420px]">
							Bridging centuries of history with augmented reality and
							expert-verified content.
						</p>

						{/* CTA */}
						<div className="headline-line mt-10">
							<button
								type="button"
								className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all duration-300 cursor-pointer"
								data-tally-open="mVR7OJ"
								data-tally-layout="modal"
								data-tally-width="600"
								data-tally-auto-close="1000"
								data-tally-transparent-background="1">
								Get Early Access
								<ArrowRight className="w-4 h-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				</div>

				{/* Right Column — Video */}
				<div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-12 xl:px-16 pb-16 lg:py-0 min-h-[50vh] lg:min-h-screen">
					<div
						ref={videoRef}
						className="relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[420px]"
						aria-hidden="true">
						{/* Single clean border */}
						<div className="relative aspect-3/4 rounded-2xl overflow-hidden border border-white/8 shadow-2xl">
							{isInView ? (
								<video
									src="/shot1.mp4"
									autoPlay
									loop
									muted
									playsInline
									preload="metadata"
									aria-hidden="true"
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full bg-[#111] animate-pulse" />
							)}
							{/* Subtle overlay */}
							<div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
						</div>

						{/* Ambient glow behind video */}
						<div className="absolute inset-0 bg-white/5 blur-3xl scale-110 rounded-3xl -z-10" />
					</div>
				</div>
			</div>
		</section>
	);
};

export default SolutionSplit;
