"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import LiquidEther from "../LiquidEther";

gsap.registerPlugin(ScrollTrigger);

const Problem = () => {
	const sectionRef = useRef(null);
	const textsRef = useRef([]);

	const texts = [
		"You stand before a 1,000-year-old monument, but all you see is stone. Audio guides are boring. Plaques tell you dates, not stories.",
		"90% of tourists cite lack of context as their #1 frustration",
		"Heritage tourists spend over $50 billion annually on unsatisfactory experiences",
		"Traditional guides can't show you what these sites looked like in their glory days",
		"Until now.",
	];

	useEffect(() => {
		const section = sectionRef.current;
		const textElements = textsRef.current;

		if (!section) return;

		const ctx = gsap.context(() => {
			// Set initial state - hide all texts
			textElements.forEach((text) => {
				gsap.set(text, { opacity: 0, y: 30 });
			});

			// Create main timeline with ScrollTrigger - optimized with shorter duration
			const mainTl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: `+=${window.innerHeight * texts.length * 0.4}`, // Reduced for better performance
					pin: true,
					scrub: 0.5,
					snap: {
						snapTo: 1 / (texts.length - 1),
						duration: 0.2,
						ease: "power1.inOut",
					},
					markers: false,
				},
			});

			// Add animations for each text with optimized timing
			textElements.forEach((text, index) => {
				if (!text) return;

				const startTime = index * 1.0; // Faster transitions

				// Fade in - simplified
				mainTl.to(
					text,
					{
						opacity: 1,
						y: 0,
						duration: 0.4,
						ease: "power1.out",
					},
					startTime
				);

				// Fade out (except last one) - simplified
				if (index < texts.length - 1) {
					mainTl.to(
						text,
						{
							opacity: 0,
							y: -30,
							duration: 0.4,
							ease: "power1.in",
						},
						startTime + 0.6
					);
				}
			});
		}, section);

		return () => ctx.revert();
	}, [texts.length]);

	return (
		<div
			ref={sectionRef}
			className="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
			{texts.map((text, index) => (
				<div
					key={index}
					ref={(el) => (textsRef.current[index] = el)}
					className="absolute inset-0 flex items-center justify-center px-2 sm:px-6 md:px-10">
					<h2 className="text-3xl sm:text-2xl md:text-4xl lg:text-5xl font-medium text-black text-center font-montserrat">
						{text}
					</h2>
				</div>
			))}
		</div>
	);
};

export default Problem;
