"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SolutionSplit = () => {
	const sectionRef = useRef(null);
	const textRef = useRef(null);
	const videoRef = useRef(null);
	const videoElementRef = useRef(null);
	const decorRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	const headlineLines = [
		{ text: "We Reconstruct", weight: "light" },
		{ text: "History", weight: "bold" },
		{ text: "In The Real World", weight: "light" },
		{ text: "Across Time", weight: "bold" },
	];

	useEffect(() => {
		const section = sectionRef.current;
		const textContainer = textRef.current;
		const videoContainer = videoRef.current;
		const decorElements = decorRef.current;

		if (!section || !textContainer || !videoContainer) return;

		// Intersection Observer for lazy loading video
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isInView) {
						setIsInView(true);
					}
				});
			},
			{ threshold: 0.1, rootMargin: "200px" },
		);

		observer.observe(section);

		const ctx = gsap.context(() => {
			// Get all text lines
			const lines = textContainer.querySelectorAll(".headline-line");
			const decorLines = decorElements?.querySelectorAll(".decor-line");

			// Set initial state for lines
			gsap.set(lines, {
				opacity: 0,
				x: -60,
			});

			// Set initial state for decorative lines
			if (decorLines) {
				gsap.set(decorLines, {
					scaleX: 0,
					transformOrigin: "left center",
				});
			}

			// Staggered slide-in animation for text lines
			gsap.to(lines, {
				opacity: 1,
				x: 0,
				duration: 1,
				stagger: 0.12,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					end: "top 30%",
					toggleActions: "play none none reverse",
				},
			});

			// Animate decorative lines
			if (decorLines) {
				gsap.to(decorLines, {
					scaleX: 1,
					duration: 1.2,
					stagger: 0.1,
					ease: "power2.out",
					scrollTrigger: {
						trigger: section,
						start: "top 60%",
						toggleActions: "play none none reverse",
					},
				});
			}

			// Video container fade and scale
			gsap.set(videoContainer, {
				opacity: 0,
				scale: 0.9,
			});

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

			// Parallax effect for video - moves at 50% speed
			gsap.to(videoContainer, {
				yPercent: -10,
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
	}, [isInView]);

	return (
		<section
			ref={sectionRef}
			className="yz-section yz-section-dark relative min-h-screen overflow-hidden"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Subtle Grid Background */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
									  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
					backgroundSize: "60px 60px",
				}}
			/>

			{/* Ambient Glow */}
			<div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-white/2 rounded-full blur-[150px] pointer-events-none" />
			<div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-white/1.5 rounded-full blur-[120px] pointer-events-none" />

			<div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
				{/* Left Column - Text Content */}
				<div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-start px-6 sm:px-10 lg:px-16 xl:px-24 py-12 sm:py-16 lg:py-0 min-h-[40vh] sm:min-h-[50vh] lg:min-h-screen">
					<div className="relative max-w-[600px]">
						{/* Decorative Elements */}
						<div
							ref={decorRef}
							className="absolute -left-4 sm:-left-8 top-0 bottom-0 flex flex-col justify-center gap-8 opacity-40 sm:flex">
							<div className="decor-line w-12 sm:w-16 h-px bg-white/30" />
							<div className="decor-line w-8 sm:w-12 h-px bg-white/20" />
							<div className="decor-line w-6 sm:w-8 h-px bg-white/10" />
						</div>

						{/* Text Content */}
						<div ref={textRef} className="space-y-1 sm:space-y-2">
							{headlineLines.map((line, index) => (
								<h2
									key={index}
									className={`headline-line text-white font-montserrat leading-[1.1] tracking-[0.02em] sm:tracking-[0.04em] ${
										line.weight === "bold"
											? "font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
											: "font-light text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl opacity-70"
									}`}>
									{line.text}
								</h2>
							))}
						</div>

						{/* Subtle tagline */}
						<p className="mt-6 sm:mt-8 lg:mt-12 text-white/40 text-sm sm:text-base font-light tracking-wide max-w-[400px]">
							Bridging centuries of history with cutting-edge technology
						</p>
					</div>
				</div>

				{/* Right Column - Video Element */}
				<div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-0 pt-4 pb-16 sm:py-10 lg:py-0 min-h-[45vh] sm:min-h-[55vh] lg:min-h-screen relative">
					{/* Video Container with Frame */}
					<div
						ref={videoRef}
						className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[450px] xl:max-w-[500px]"
						aria-hidden="true">
						{/* Decorative Frame */}
						<div className="absolute -inset-3 sm:-inset-4 md:-inset-6 border border-white/10 rounded-2xl sm:rounded-3xl" />
						<div className="absolute -inset-6 sm:-inset-8 md:-inset-12 border border-white/5 rounded-3xl sm:rounded-4xl" />

						{/* Glow Effect Behind Video */}
						<div className="absolute inset-0 bg-white/5 blur-3xl transform scale-110 rounded-3xl" />

						{/* Video Wrapper */}
						<div className="relative aspect-3/4 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
							{/* Corner Accents */}
							<div className="absolute top-0 left-0 w-8 sm:w-12 h-8 sm:h-12 border-t-2 border-l-2 border-white/20 rounded-tl-xl sm:rounded-tl-2xl z-10" />
							<div className="absolute top-0 right-0 w-8 sm:w-12 h-8 sm:h-12 border-t-2 border-r-2 border-white/20 rounded-tr-xl sm:rounded-tr-2xl z-10" />
							<div className="absolute bottom-0 left-0 w-8 sm:w-12 h-8 sm:h-12 border-b-2 border-l-2 border-white/20 rounded-bl-xl sm:rounded-bl-2xl z-10" />
							<div className="absolute bottom-0 right-0 w-8 sm:w-12 h-8 sm:h-12 border-b-2 border-r-2 border-white/20 rounded-br-xl sm:rounded-br-2xl z-10" />

							{isInView ? (
								<video
									ref={videoElementRef}
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
								<div className="w-full h-full bg-[#1A1A1A] animate-pulse" />
							)}

							{/* Subtle overlay for depth */}
							<div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
						</div>

						{/* Video Label */}
						<div className="absolute -bottom-8 sm:-bottom-12 left-1/2 -translate-x-1/2 text-center">
							<p className="text-white/30 text-xs sm:text-sm tracking-[0.2em] uppercase font-light">
								Live Preview
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default SolutionSplit;
