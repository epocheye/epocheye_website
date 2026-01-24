"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FinalCTA = () => {
	const sectionRef = useRef(null);
	const headlineRef = useRef(null);
	const buttonsRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		const headline = headlineRef.current;
		const buttons = buttonsRef.current;

		if (!section || !headline || !buttons) return;

		const ctx = gsap.context(() => {
			// Headline animation
			gsap.set(headline, {
				opacity: 0,
				y: 40,
			});

			gsap.to(headline, {
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

			// Buttons animation (staggered)
			const btns = buttons.querySelectorAll(".cta-button");
			gsap.set(btns, {
				opacity: 0,
				y: 30,
			});

			gsap.to(btns, {
				opacity: 1,
				y: 0,
				duration: 0.6,
				stagger: 0.15,
				delay: 0.3,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 50%",
					toggleActions: "play none none reverse",
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="yz-section flex items-center justify-center
				px-5 sm:px-10 lg:px-20 py-20 sm:py-24 lg:py-[120px]"
			style={{
				background: "linear-gradient(to bottom, #0A0A0A, #1A1A1A)",
				position: "relative",
			}}>
			{/* Subtle gold shimmer overlay */}
			<div
				className="absolute inset-0 opacity-[0.03]"
				style={{
					background:
						"radial-gradient(ellipse at center, #D4AF37 0%, transparent 70%)",
				}}
			/>

			<div className="relative z-10 text-center max-w-[900px]">
				{/* Main Headline */}
				<div ref={headlineRef}>
					<h2
						className="font-montserrat font-bold uppercase text-white leading-[1.2]
							text-[32px] sm:text-[50px] lg:text-[70px]
							tracking-[3px] sm:tracking-[5px] lg:tracking-[7px]">
						READY TO SEE
					</h2>
					<h2
						className="font-montserrat font-bold uppercase text-white leading-[1.2]
							text-[32px] sm:text-[50px] lg:text-[70px]
							tracking-[3px] sm:tracking-[5px] lg:tracking-[7px]">
						HISTORY DIFFERENTLY?
					</h2>
				</div>

				{/* CTA Buttons */}
				<div
					ref={buttonsRef}
					className="mt-12 sm:mt-16 lg:mt-20 flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-8 lg:gap-10">
					<a
						href="#waitlist"
						className="cta-button yz-button w-full sm:w-auto
							px-8 sm:px-10 lg:px-12
							py-5 sm:py-6
							text-[14px] sm:text-[15px] lg:text-[16px]">
						GET EARLY ACCESS
					</a>
					<a
						href="#partner"
						className="cta-button yz-button w-full sm:w-auto
							px-8 sm:px-10 lg:px-12
							py-5 sm:py-6
							text-[14px] sm:text-[15px] lg:text-[16px]">
						PARTNER WITH US
					</a>
				</div>
			</div>
		</section>
	);
};

export default FinalCTA;
