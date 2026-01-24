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
	const [isInView, setIsInView] = useState(false);

	const headlineLines = ["We Reconstruct", "History In The", "Real World", "And Across Time"];

	useEffect(() => {
		const section = sectionRef.current;
		const textContainer = textRef.current;
		const videoContainer = videoRef.current;

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

			// Set initial state for lines
			gsap.set(lines, {
				opacity: 0,
				y: 60,
			});

			// Staggered fade-in animation for text lines
			gsap.to(lines, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				stagger: 0.15,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					end: "top 30%",
					toggleActions: "play none none reverse",
				},
			});

			// Parallax effect for video - moves at 50% speed
			gsap.to(videoContainer, {
				yPercent: -20,
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
			className="yz-section yz-section-dark flex flex-col lg:flex-row">
			{/* Left Column - Text Content */}
			<div className="w-full lg:w-1/2 flex items-center justify-start px-6 sm:px-10 lg:px-20 py-20 lg:py-0 min-h-[60vh] lg:min-h-screen">
				<div ref={textRef} className="max-w-[600px]">
					{headlineLines.map((line, index) => (
						<h2
							key={index}
							className="headline-line text-white font-montserrat font-bold  leading-[1.1]
								text-4xl sm:text-5xl lg:text-6xl
								tracking-[2px] sm:tracking-[4px] lg:tracking-[6px]
								mb-2 sm:mb-3 lg:mb-4">
							{line}
						</h2>
					))}
				</div>
			</div>

			{/* Right Column - Video Element */}
			<div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-0 py-10 lg:py-0 min-h-[50vh] lg:min-h-screen lg:sticky lg:top-0">
				<div
					ref={videoRef}
					className="w-full max-w-[320px] sm:max-w-[400px] lg:max-w-[600px] aspect-3/4">
					{isInView ? (
						<video
							ref={videoElementRef}
							src="/shot1.mp4"
							autoPlay
							loop
							muted
							playsInline
							preload="metadata"
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full bg-[#1A1A1A]" />
					)}
				</div>
			</div>
		</section>
	);
};

export default SolutionSplit;
