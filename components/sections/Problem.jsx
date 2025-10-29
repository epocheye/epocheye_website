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
		"Heritage Tourism is Broken",
		"90% of tourists cite lack of context as their #1 frustration",
		"'I spent $50 on a Taj Mahal guide and couldn't remember a single fact two hours later' — Every tourist ever",
		"The Solution ??",
		"Your phone can do so much more than play a podcast",
	];

	useEffect(() => {
		const section = sectionRef.current;
		const textElements = textsRef.current;

		if (!section) return;

		const ctx = gsap.context(() => {
			// Set initial state - hide all texts
			textElements.forEach((text) => {
				gsap.set(text, { opacity: 0, scale: 0.8, y: 50 });
			});

			// Create main timeline with ScrollTrigger - reduced scroll distance
			const mainTl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: `+=${window.innerHeight * texts.length * 0.5}`, // Further reduced to minimize white space
					pin: true,
					scrub: 1,
					snap: {
						snapTo: 1 / (texts.length - 1), // Snap to each text position
						duration: 0.3,
						ease: "power2.inOut",
					},
					markers: false,
				},
			});

			// Add animations for each text with adjusted timing
			textElements.forEach((text, index) => {
				if (!text) return;

				const startTime = index * 1.2; // Further reduced for faster transitions

				// Fade in
				mainTl.to(
					text,
					{
						opacity: 1,
						scale: 1,
						y: 0,
						duration: 0.5, // Faster fade in
						ease: "power2.out",
					},
					startTime
				);

				// Fade out (except last one)
				if (index < texts.length - 1) {
					mainTl.to(
						text,
						{
							opacity: 0,
							scale: 0.9,
							y: -50,
							duration: 0.5, // Faster fade out
							ease: "power2.in",
						},
						startTime + 0.8
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
					className="absolute inset-0 flex items-center justify-center px-5 md:px-10">
					<h2 className="text-2xl md:text-4xl lg:text-5xl font-medium text-black text-center font-montserrat">
						{text}
					</h2>
				</div>
			))}
		</div>
	);
};

export default Problem;
