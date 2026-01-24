"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const VideoFeature = () => {
	const sectionRef = useRef(null);
	const contentRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		const content = contentRef.current;

		if (!section || !content) return;

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
			// Set initial state for content
			gsap.set(content, {
				opacity: 0,
				y: 50,
			});

			// Fade in content
			gsap.to(content, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 50%",
					toggleActions: "play none none reverse",
				},
			});

			// Parallax effect for text content - moves at 60% speed
			gsap.to(content, {
				yPercent: -15,
				ease: "none",
				scrollTrigger: {
					trigger: section,
					start: "top bottom",
					end: "bottom top",
					scrub: 0.6,
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
			className="yz-section relative flex items-center overflow-hidden">
			{/* Video Background */}
			<div className="absolute inset-0 w-full h-full">
				{isInView ? (
					<video
						src="/shot2.mp4"
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full bg-[#0A0A0A]" />
				)}
				{/* Gradient Overlay */}
				<div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/70" />
			</div>

			{/* Text Content */}
			<div
				ref={contentRef}
				className="relative z-10 w-full px-5 sm:px-10 lg:px-20 py-20 lg:py-0
					flex flex-col items-center lg:items-start justify-center min-h-screen
					lg:pl-[10%]">
				<div className="max-w-[800px] text-center lg:text-left">
					{/* Main Headline */}
					<h2
						className="font-montserrat font-bold uppercase leading-[1.1]
							text-5xl sm:text-7xl lg:text-8xl
							tracking-[4px] sm:tracking-[6px] lg:tracking-[10px]
							text-white"
						style={{
							textShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
						}}>
						SEE TIME.
					</h2>
					<h2
						className="font-montserrat font-bold uppercase leading-[1.1]
							text-5xl sm:text-7xl lg:text-8xl
							tracking-[4px] sm:tracking-[6px] lg:tracking-[10px]
							text-white mt-2"
						style={{
							textShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
						}}>
						NOT JUST SPACE.
					</h2>

					{/* Subtext */}
					<p
						className="mt-8 sm:mt-10 lg:mt-10  mx-auto lg:mx-0
							text-base sm:text-lg lg:text-xl
							font-medium leading-[1.6]
							tracking-[1px] sm:tracking-[1.5px] lg:tracking-[2px]"
						style={{ color: "#E0E0E0" }}>
						Scrub through centuries with a timeline slider. From original
						construction to present decay.
					</p>
				</div>
			</div>
		</section>
	);
};

export default VideoFeature;
