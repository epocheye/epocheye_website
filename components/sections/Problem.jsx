"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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

			// Create main timeline with ScrollTrigger
			const mainTl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: `+=${window.innerHeight * texts.length * 2}`,
					pin: true,
					scrub: 1,
					markers: false,
				},
			});

			// Add animations for each text
			textElements.forEach((text, index) => {
				if (!text) return;

				// Fade in
				mainTl.to(
					text,
					{
						opacity: 1,
						scale: 1,
						y: 0,
						duration: 1,
						ease: "power2.out",
					},
					index * 2
				);

				// Fade out (except last one)
				if (index < texts.length - 1) {
					mainTl.to(
						text,
						{
							opacity: 0,
							scale: 0.9,
							y: -50,
							duration: 1,
							ease: "power2.in",
						},
						index * 2 + 1
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
					className="absolute inset-0 flex items-center justify-center px-10">
					<h2 className="text-4xl md:text-6xl lg:text-7xl font-medium text-black text-center font-montserrat">
						{text}
					</h2>
				</div>
			))}
		</div>
	);
};

export default Problem;
