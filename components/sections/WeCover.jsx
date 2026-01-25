"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const civilizations = [
	"Ancient Rome and Greece",
	"Indian Heritage",
	"Mayan Civilization",
	"Incan Heritage",
	"Khmer Empire",
	"Egyptian Dynasties",
	"Medieval Europe",
	"Asian Temples",
];

const WeCover = () => {
	const sectionRef = useRef(null);
	const titleRef = useRef(null);
	const listRef = useRef(null);
	const ctaRef = useRef(null);
	const transitionRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		const title = titleRef.current;
		const list = listRef.current;
		const cta = ctaRef.current;
		const transition = transitionRef.current;

		if (!section || !title || !list || !cta) return;

		const ctx = gsap.context(() => {
			// Section entrance - subtle fade in
			gsap.set(section, {
				opacity: 0,
			});

			gsap.to(section, {
				opacity: 1,
				duration: 1,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 85%",
					end: "top 60%",
					scrub: 0.5,
				},
			});

			// Title animation with blur reveal
			gsap.set(title, {
				opacity: 0,
				x: -80,
				filter: "blur(15px)",
			});

			gsap.to(title, {
				opacity: 1,
				x: 0,
				filter: "blur(0px)",
				duration: 1.2,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					toggleActions: "play none none reverse",
				},
			});

			// List items staggered animation with smooth fade
			const items = list.querySelectorAll(".civ-item");
			gsap.set(items, {
				opacity: 0,
				y: 40,
				filter: "blur(8px)",
			});

			gsap.to(items, {
				opacity: 1,
				y: 0,
				filter: "blur(0px)",
				duration: 0.8,
				stagger: 0.08,
				ease: "power2.out",
				scrollTrigger: {
					trigger: list,
					start: "top 75%",
					toggleActions: "play none none reverse",
				},
			});

			// CTA animation
			gsap.set(cta, {
				opacity: 0,
				y: 20,
			});

			gsap.to(cta, {
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

			// Bottom transition gradient - grows as you scroll toward exit
			if (transition) {
				gsap.set(transition, {
					opacity: 0,
					scaleY: 0,
				});

				gsap.to(transition, {
					opacity: 1,
					scaleY: 1,
					ease: "none",
					scrollTrigger: {
						trigger: section,
						start: "center center",
						end: "bottom top",
						scrub: true,
					},
				});
			}
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			id="we-cover"
			className="yz-section yz-section-dark flex flex-col lg:flex-row items-center justify-center relative
				px-6 sm:px-10 lg:px-20 py-20 lg:py-40"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Subtle background pattern */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.02]"
				style={{
					backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Top fade-in from previous section */}
			<div
				className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
				style={{
					background:
						"linear-gradient(to bottom, rgba(10, 10, 10, 0.8), transparent)",
				}}
			/>

			{/* Left Column - Large Title */}
			<div
				ref={titleRef}
				className="relative z-10 w-full lg:w-[35%] flex flex-col items-center lg:items-start justify-center mb-12 lg:mb-0">
				<h2
					className="font-montserrat font-bold uppercase text-white leading-[1.1]
						text-6xl sm:text-7xl lg:text-8xl
						tracking-[6px] sm:tracking-[8px] lg:tracking-[12px]">
					WE
				</h2>
				<h2
					className="font-montserrat font-bold uppercase text-white leading-[1.1]
						text-6xl sm:text-7xl lg:text-8xl
						tracking-[6px] sm:tracking-[8px] lg:tracking-[12px]">
					COVER
				</h2>

				{/* Decorative line under title */}
				<div
					className="mt-6 h-0.5 w-20 lg:w-32"
					style={{
						background: "linear-gradient(to right, #D4AF37, transparent)",
					}}
				/>
			</div>

			{/* Right Column - Category List */}
			<div
				ref={listRef}
				className="relative z-10 w-full lg:w-[65%] flex flex-col items-center lg:items-start lg:pl-10">
				<ul className="space-y-6 sm:space-y-8 lg:space-y-10">
					{civilizations.map((civ, index) => (
						<li
							key={index}
							className="civ-item font-montserrat font-normal uppercase text-white
								text-[20px] sm:text-[28px] lg:text-[36px]
								tracking-[2px] sm:tracking-[3px] lg:tracking-[4px]
								hover:text-[#D4AF37] transition-all duration-300 cursor-default
								hover:translate-x-2 hover:tracking-[5px]">
							<span className="inline-block mr-4 opacity-30 text-[#D4AF37]">
								0{index + 1}
							</span>
							{civ}
						</li>
					))}
				</ul>
			</div>

			{/* Bottom Right CTA */}
			<a
				ref={ctaRef}
				href="#global-reach"
				className="absolute bottom-10 sm:bottom-14 lg:bottom-16 right-6 sm:right-10 lg:right-20
					yz-gold-link hidden sm:block z-10">
				VIEW ALL MONUMENTS
			</a>

			{/* Mobile CTA */}
			<a href="#global-reach" className="sm:hidden mt-12 yz-gold-link relative z-10">
				VIEW ALL MONUMENTS
			</a>

			{/* Bottom transition gradient - leads into next section */}
			<div
				ref={transitionRef}
				className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none origin-bottom"
				style={{
					background: "linear-gradient(to bottom, transparent, rgba(10, 10, 10, 1))",
				}}
			/>
		</section>
	);
};

export default WeCover;
