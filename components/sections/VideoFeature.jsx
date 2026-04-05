"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

gsap.registerPlugin(ScrollTrigger);

const steps = [
	{
		number: "01",
		title: "Point",
		description: "Aim your phone at any heritage monument",
	},
	{
		number: "02",
		title: "Explore",
		description: "Scrub through centuries on the timeline",
	},
	{
		number: "03",
		title: "Discover",
		description: "Unlock stories verified by historians",
	},
];

const VideoFeature = () => {
	const sectionRef = useRef(null);
	const contentRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		const content = contentRef.current;

		if (!section || !content) return;

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
			gsap.set(content, { opacity: 0, y: 50 });
			gsap.to(content, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 55%",
					toggleActions: "play none none reverse",
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
			className="relative flex items-center justify-center overflow-hidden min-h-screen">
			{/* Video Background */}
			<div className="absolute inset-0 w-full h-full" aria-hidden="true">
				{isInView ? (
					<video
						src="/shot2.mp4"
						autoPlay
						loop
						muted
						playsInline
						preload="metadata"
						aria-hidden="true"
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full bg-[#080808]" />
				)}
				<div className="absolute inset-0 bg-black/65" />
			</div>

			<DarkBeamsBackground
				opacity={0.14}
				scrimOpacity={0.1}
				beamProps={{ beamNumber: 7, speed: 0.45, rotation: -4 }}
			/>

			{/* Content */}
			<div
				ref={contentRef}
				className="relative z-10 w-full max-w-5xl mx-auto px-6 sm:px-10 py-24 flex flex-col items-center">
				{/* Label */}
				<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/60 border border-white/20 rounded-full uppercase mb-8">
					How It Works
				</span>

				<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl text-center mb-4 leading-tight">
					Three steps to
					<br />
					<span className="font-semibold">see through time</span>
				</h2>

				<p className="text-white/60 text-base sm:text-lg text-center mb-16 font-light max-w-md">
					No setup. No guides. Just point and experience.
				</p>

				{/* Step Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
					{steps.map((step, i) => (
						<div
							key={i}
							className="bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 text-center">
							<div className="text-white/20 text-xs font-mono tracking-widest uppercase mb-4">
								{step.number}
							</div>
							<h3 className="font-montserrat font-semibold text-white text-xl mb-3">
								{step.title}
							</h3>
							<p className="text-white/65 text-sm leading-relaxed">
								{step.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default VideoFeature;
