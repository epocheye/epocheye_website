"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const monuments = [
	{
		name: "Colosseum",
		location: "Rome",
		description: "Watch the arena fill with 50,000 Romans",
		gradient: "from-amber-900/80 via-orange-800/60 to-transparent",
	},
	{
		name: "Parthenon",
		location: "Athens",
		description: "See the frieze in original color",
		gradient: "from-slate-800/80 via-blue-900/60 to-transparent",
	},
	{
		name: "Machu Picchu",
		location: "Peru",
		description: "Watch terraces under construction",
		gradient: "from-emerald-900/80 via-green-800/60 to-transparent",
	},
	{
		name: "Angkor Wat",
		location: "Cambodia",
		description: "Experience the temple alive with ceremony",
		gradient: "from-amber-800/80 via-yellow-900/60 to-transparent",
	},
	{
		name: "Petra",
		location: "Jordan",
		description: "See the rose-red city at its peak",
		gradient: "from-rose-900/80 via-red-800/60 to-transparent",
	},
];

const MonumentsGallery = () => {
	const sectionRef = useRef(null);
	const headerRef = useRef(null);
	const scrollContainerRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		const header = headerRef.current;
		const scrollContainer = scrollContainerRef.current;

		if (!section || !header || !scrollContainer) return;

		const ctx = gsap.context(() => {
			// Header animation
			gsap.set(header, {
				opacity: 0,
				y: 40,
			});

			gsap.to(header, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					toggleActions: "play none none reverse",
				},
			});

			// Cards animation
			const cards = scrollContainer.querySelectorAll(".monument-card");
			gsap.set(cards, {
				opacity: 0,
				y: 60,
			});

			gsap.to(cards, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				stagger: 0.1,
				ease: "power2.out",
				scrollTrigger: {
					trigger: scrollContainer,
					start: "top 80%",
					toggleActions: "play none none reverse",
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="yz-section yz-section-dark py-16 sm:py-20 lg:py-24"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Section Header */}
			<div ref={headerRef} className="px-6 sm:px-10 lg:px-20 mb-10 sm:mb-14 lg:mb-16">
				<h2
					className="font-montserrat font-bold uppercase text-white
						text-[40px] sm:text-[60px] lg:text-[80px]
						tracking-[4px] sm:tracking-[6px] lg:tracking-[8px]
						leading-[1.1]">
					MONUMENTS
				</h2>
				<p
					className="mt-4 sm:mt-5 font-light
						text-[16px] sm:text-[18px]
						tracking-[1.5px] sm:tracking-[2px]"
					style={{ color: "#B0B0B0" }}>
					Experience history at scale
				</p>
			</div>

			{/* Horizontal Scrolling Container */}
			<div
				ref={scrollContainerRef}
				className="yz-horizontal-scroll gap-6 sm:gap-8 lg:gap-10 px-6 sm:px-10 lg:px-20 pb-10">
				{monuments.map((monument, index) => (
					<div
						key={index}
						className="monument-card yz-scroll-card group relative overflow-hidden cursor-pointer
							w-[85vw] sm:w-[400px] lg:w-[500px]
							h-[450px] sm:h-[550px] lg:h-[600px]
							transition-transform duration-300 hover:scale-[1.02]">
						{/* Background with gradient overlay */}
						<div
							className={`absolute inset-0 bg-gradient-to-t ${monument.gradient}`}
							style={{ backgroundColor: "#1A1A1A" }}
						/>

						{/* Decorative pattern overlay */}
						<div
							className="absolute inset-0 opacity-20"
							style={{
								backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
								backgroundSize: "30px 30px",
							}}
						/>

						{/* Text Content */}
						<div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 lg:p-10 z-10">
							<h3
								className="font-montserrat font-semibold uppercase text-white
									text-[24px] sm:text-[26px] lg:text-[28px]
									tracking-[2px] sm:tracking-[3px]
									leading-tight">
								{monument.name}, {monument.location}
							</h3>
							<p
								className="mt-3 sm:mt-4 font-light
									text-[14px] sm:text-[15px] lg:text-[16px]
									tracking-[1px] sm:tracking-[1.5px]
									leading-relaxed"
								style={{ color: "#E0E0E0" }}>
								{monument.description}
							</p>
						</div>

						{/* Hover overlay */}
						<div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
					</div>
				))}
			</div>
		</section>
	);
};

export default MonumentsGallery;
