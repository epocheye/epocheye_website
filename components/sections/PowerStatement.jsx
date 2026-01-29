"use client";
import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PowerStatement = () => {
	const sectionRef = useRef(null);
	const textRef = useRef(null);
	const stripesRef = useRef(null);
	const overlayRef = useRef(null);

	// Image stripes configuration - 6 vertical columns
	const stripes = [
		{ src: "/img1.webp" },
		{ src: "/img2.webp" },
		{ src: "/img3.webp" },
		{ src: "/img4.webp" },
		{ src: "/img5.webp" },
		{ src: "/img6.webp" },
	];

	useEffect(() => {
		const section = sectionRef.current;
		const text = textRef.current;
		const stripesContainer = stripesRef.current;
		const overlay = overlayRef.current;

		if (!section || !text) return;

		const ctx = gsap.context(() => {
			// Set initial state for text
			gsap.set(text, {
				opacity: 0,
				y: 40,
			});

			// Fade in text
			gsap.to(text, {
				opacity: 1,
				y: 0,
				duration: 1.2,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					end: "top 30%",
					toggleActions: "play none none reverse",
				},
			});

			// Animate stripes
			if (stripesContainer) {
				const stripeElements = stripesContainer.querySelectorAll(".image-stripe");

				gsap.set(stripeElements, {
					opacity: 0,
					y: 80,
					scale: 1.15,
				});

				gsap.to(stripeElements, {
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 1.4,
					stagger: 0.08,
					ease: "power3.out",
					scrollTrigger: {
						trigger: section,
						start: "top 75%",
						toggleActions: "play none none reverse",
					},
				});

				// Parallax effect on scroll - alternating directions
				stripeElements.forEach((stripe, index) => {
					const direction = index % 2 === 0 ? -25 : 25;
					gsap.to(stripe, {
						y: direction,
						ease: "none",
						scrollTrigger: {
							trigger: section,
							start: "top bottom",
							end: "bottom top",
							scrub: 1.5,
						},
					});
				});
			}

			// Animate overlay for dramatic effect
			if (overlay) {
				gsap.to(overlay, {
					opacity: 0.15,
					duration: 1.5,
					ease: "power2.inOut",
					scrollTrigger: {
						trigger: section,
						start: "top 50%",
						end: "bottom 50%",
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
			className="yz-section yz-section-light relative flex items-center justify-center overflow-hidden min-h-[70vh] sm:min-h-[80vh] lg:min-h-screen"
			style={{ backgroundColor: "#F8F8F8" }}>
			{/* Image Stripes Background - Horizontal rows on mobile, vertical columns on lg+ */}
			<div
				ref={stripesRef}
				className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden flex flex-col lg:flex-row items-stretch">
				{stripes.map((stripe, index) => (
					<div
						key={index}
						className="image-stripe relative flex-1 overflow-hidden"
						style={{
							margin: "1px 0",
							minHeight: "16.666%",
						}}>
						<div className="absolute inset-0 overflow-hidden">
							<Image
								src={stripe.src}
								alt=""
								fill
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
								priority={index < 3}
								quality={90}
								className="object-cover transition-transform duration-700"
								style={{
									objectPosition: "center",
								}}
							/>
							{/* Individual stripe overlay for depth */}
							<div className="absolute inset-0 bg-linear-to-b from-[#F8F8F8]/10 via-transparent to-[#F8F8F8]/20" />
						</div>
					</div>
				))}
			</div>

			{/* Main Overlay for Text Readability */}
			<div
				ref={overlayRef}
				className="absolute inset-0 z-5 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse 80% 60% at 50% 50%, rgba(248, 248, 248, 0.85) 0%, rgba(248, 248, 248, 0.4) 50%, transparent 80%)
					`,
				}}
			/>

			{/* Vignette Effect */}
			<div
				className="absolute inset-0 z-5 pointer-events-none"
				style={{
					background: `
						linear-gradient(to right, rgba(248, 248, 248, 0.9) 0%, transparent 15%, transparent 85%, rgba(248, 248, 248, 0.9) 100%),
						linear-gradient(to bottom, rgba(248, 248, 248, 0.8) 0%, transparent 20%, transparent 80%, rgba(248, 248, 248, 0.8) 100%)
					`,
				}}
			/>

			{/* Text Content */}
			<div
				ref={textRef}
				className="relative z-10 text-center px-4 sm:px-6 md:px-8 max-w-[95vw] sm:max-w-[90vw] lg:max-w-[1200px]">
				{/* Decorative Line Above */}
				<div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
					<div className="w-8 sm:w-12 md:w-16 h-px bg-[#0A0A0A]/20" />
					<div className="w-2 h-2 rounded-full bg-[#0A0A0A]/30" />
					<div className="w-8 sm:w-12 md:w-16 h-px bg-[#0A0A0A]/20" />
				</div>

				{/* Main Headline */}
				<h2
					className="font-montserrat font-bold uppercase leading-[1.15] text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-[0.08em] sm:tracking-widest md:tracking-[0.12em]"
					style={{
						color: "#0A0A0A",
						textShadow: "0 2px 30px rgba(248, 248, 248, 0.9)",
					}}>
					Point Your Phone.
				</h2>

				{/* Secondary Headline */}
				<h2
					className="font-montserrat font-semibold uppercase leading-[1.15] text-[28px] sm:text-4xl md:text-5xl lg:text-6xl xl:text-[5.5rem] tracking-[0.08em] sm:tracking-widest md:tracking-[0.12em] mt-2 sm:mt-3 md:mt-4"
					style={{
						color: "#0A0A0A",
						textShadow: "0 2px 30px rgba(248, 248, 248, 0.9)",
					}}>
					Watch Centuries Unfold.
				</h2>

				{/* Decorative Line Below */}
				<div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
					<div className="w-8 sm:w-12 md:w-16 h-px bg-[#0A0A0A]/20" />
					<div className="w-2 h-2 rounded-full bg-[#0A0A0A]/30" />
					<div className="w-8 sm:w-12 md:w-16 h-px bg-[#0A0A0A]/20" />
				</div>
			</div>
		</section>
	);
};

export default PowerStatement;
