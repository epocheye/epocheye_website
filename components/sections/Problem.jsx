"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Problem = () => {
	const sectionRef = useRef(null);
	const textsRef = useRef([]);
	const wordsRef = useRef([]);

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
			// Set initial state - hide all text containers and blur all words
			textElements.forEach((textEl, textIndex) => {
				if (!textEl) return;

				// Hide all text containers except the first one
				gsap.set(textEl, {
					opacity: textIndex === 0 ? 1 : 0,
					display: textIndex === 0 ? "flex" : "none",
				});

				// Get all words in this text and set initial blur state
				const words = wordsRef.current[textIndex];
				if (words) {
					words.forEach((word) => {
						if (word) {
							gsap.set(word, {
								filter: "blur(10px)",
								opacity: 0.3,
							});
						}
					});
				}
			});

			// Calculate total scroll duration based on all words
			const totalWords = texts.reduce((acc, text) => acc + text.split(" ").length, 0);
			const scrollPerWord = 30; // pixels of scroll per word
			const scrollPerTransition = 150; // pixels for transition between sentences
			const totalScroll = totalWords * scrollPerWord + texts.length * scrollPerTransition;

			// Create main timeline with ScrollTrigger
			const mainTl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top top",
					end: `+=${totalScroll}`,
					pin: true,
					scrub: 0.8, // Smooth scrubbing
					markers: false,
				},
			});

			let timelinePosition = 0;

			// Animate each text block
			textElements.forEach((textEl, textIndex) => {
				if (!textEl) return;

				const words = wordsRef.current[textIndex];
				if (!words) return;

				const wordCount = words.length;
				const wordDuration = 0.15; // Duration for each word reveal
				const sentenceDuration = wordCount * wordDuration;

				// If not the first text, fade in the container
				if (textIndex > 0) {
					mainTl.to(
						textEl,
						{
							opacity: 1,
							display: "flex",
							duration: 0.3,
							ease: "power2.out",
						},
						timelinePosition,
					);
					timelinePosition += 0.2;
				}

				// Animate each word - reveal from blur
				words.forEach((word, wordIndex) => {
					if (!word) return;

					mainTl.to(
						word,
						{
							filter: "blur(0px)",
							opacity: 1,
							duration: wordDuration,
							ease: "power2.out",
						},
						timelinePosition + wordIndex * wordDuration * 0.7,
					);
				});

				timelinePosition += sentenceDuration + 0.3; // Add pause after sentence

				// Fade out current text (except the last one)
				if (textIndex < texts.length - 1) {
					// First blur words back out
					words.forEach((word, wordIndex) => {
						if (!word) return;
						mainTl.to(
							word,
							{
								filter: "blur(8px)",
								opacity: 0.2,
								duration: 0.2,
								ease: "power2.in",
							},
							timelinePosition + wordIndex * 0.02,
						);
					});

					timelinePosition += 0.25;

					// Then fade out the container
					mainTl.to(
						textEl,
						{
							opacity: 0,
							duration: 0.3,
							ease: "power2.in",
							onComplete: () => {
								gsap.set(textEl, { display: "none" });
							},
						},
						timelinePosition,
					);

					timelinePosition += 0.4;
				}
			});
		}, section);

		return () => ctx.revert();
	}, [texts.length]);

	// Split text into words and create refs
	const renderTextWithWords = (text, textIndex) => {
		const words = text.split(" ");

		// Initialize the words ref array for this text if not exists
		if (!wordsRef.current[textIndex]) {
			wordsRef.current[textIndex] = [];
		}

		return words.map((word, wordIndex) => (
			<span
				key={wordIndex}
				ref={(el) => {
					if (!wordsRef.current[textIndex]) {
						wordsRef.current[textIndex] = [];
					}
					wordsRef.current[textIndex][wordIndex] = el;
				}}
				className="inline-block mr-[0.3em] will-change-[filter,opacity]"
				style={{
					filter: "blur(10px)",
					opacity: 0.3,
				}}>
				{word}
			</span>
		));
	};

	return (
		<div
			ref={sectionRef}
			className="relative w-full h-screen flex items-center justify-center bg-white overflow-hidden">
			{texts.map((text, index) => (
				<div
					key={index}
					ref={(el) => (textsRef.current[index] = el)}
					className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 md:px-16 lg:px-24"
					style={{ display: index === 0 ? "flex" : "none" }}>
					<h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-black text-center font-montserrat leading-relaxed max-w-5xl flex flex-wrap justify-center">
						{renderTextWithWords(text, index)}
					</h2>
				</div>
			))}
		</div>
	);
};

export default Problem;
