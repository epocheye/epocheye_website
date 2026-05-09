"use client";
import React, { useEffect, useRef, useState } from "react";

const STEPS = [
	{
		number: "01",
		title: "Point",
		description: "Aim your phone at any heritage monument.",
	},
	{
		number: "02",
		title: "Explore",
		description: "Scrub through centuries on the timeline.",
	},
	{
		number: "03",
		title: "Discover",
		description: "Unlock stories verified by historians.",
	},
];

const HowItWorks = () => {
	const sectionRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsInView(true);
						observer.unobserve(section);
					}
				});
			},
			{ threshold: 0.1, rootMargin: "0px" }
		);

		observer.observe(section);
		return () => observer.disconnect();
	}, []);

	return (
		<section
			ref={sectionRef}
			id="how-it-works"
			className="relative flex items-center justify-center overflow-hidden min-h-screen">
			{/* Video background */}
			<div className="absolute inset-0 w-full h-full" aria-hidden="true">
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
					<div className="w-full h-full bg-[#080808]" />
				)}
				<div className="absolute inset-0 bg-black/72" />
			</div>

			<div className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 py-24 sm:py-32">
				<div className="mb-14 sm:mb-20 max-w-3xl">
					<span className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
						{"// HOW IT WORKS"}
					</span>
					<h2 className="font-instrument-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
						Three steps to see through time.
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-7 sm:gap-9">
					{STEPS.map((step) => (
						<div
							key={step.number}
							className="brutalist-card bg-[#0d0d0d]/90 backdrop-blur-md p-7 sm:p-8 flex flex-col">
							<span className="font-instrument-serif text-4xl sm:text-5xl text-accent leading-none mb-6">
								{step.number}
							</span>
							<h3 className="font-instrument-serif text-white text-2xl sm:text-3xl leading-tight mb-3">
								{step.title}
							</h3>
							<p className="text-white/70 text-base sm:text-lg leading-relaxed font-instrument-sans">
								{step.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default HowItWorks;
