"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PowerStatement = () => {
	const sectionRef = useRef(null);
	const textRef = useRef(null);
	const stripesRef = useRef(null);

	// Image stripes configuration - 6 vertical columns
	const stripes = [
		{ src: "/img1.webp", delay: 0 },
		{ src: "/img2.webp", delay: 0.1 },
		{ src: "/img3.webp", delay: 0.2 },
		{ src: "/img4.webp", delay: 0.3 },
		{ src: "/img5.webp", delay: 0.4 },
		{ src: "/img6.webp", delay: 0.5 },
	];

	useEffect(() => {
		const section = sectionRef.current;
		const text = textRef.current;
		const stripesContainer = stripesRef.current;

		if (!section || !text) return;

		const ctx = gsap.context(() => {
			// Set initial state for text
			gsap.set(text, {
				opacity: 0,
				scale: 0.95,
			});

			// Scale and fade animation for text
			gsap.to(text, {
				opacity: 1,
				scale: 1,
				duration: 1,
				ease: "power2.out",
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
					y: 100,
					scale: 1.1,
				});

				gsap.to(stripeElements, {
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 1.2,
					stagger: 0.1,
					ease: "power3.out",
					scrollTrigger: {
						trigger: section,
						start: "top 70%",
						toggleActions: "play none none reverse",
					},
				});

				// Parallax effect on scroll
				stripeElements.forEach((stripe, index) => {
					const direction = index % 2 === 0 ? -30 : 30;
					gsap.to(stripe, {
						y: direction,
						ease: "none",
						scrollTrigger: {
							trigger: section,
							start: "top bottom",
							end: "bottom top",
							scrub: 1,
						},
					});
				});
			}
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="yz-section yz-section-light relative flex items-center justify-center overflow-hidden px-5 sm:px-10 lg:px-20 py-20 sm:py-20 lg:py-[120px]"
			style={{ backgroundColor: "#F8F8F8" }}>
			{/* Image Stripes Background - 6 Vertical Columns */}
			<div
				ref={stripesRef}
				className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-hidden flex">
				{stripes.map((stripe, index) => (
					<div
						key={index}
						className="image-stripe relative h-full flex-1"
						style={{
							borderRight:
								index < 5 ? "1px solid rgba(200, 200, 200, 0.3)" : "none",
						}}>
						<div
							className="relative w-full h-full overflow-hidden"
							style={{
								filter: "none",
								mixBlendMode: "normal",
							}}>
							<img
								src={stripe.src}
								alt=""
								loading={index < 3 ? "eager" : "lazy"}
								decoding="async"
								fetchPriority={index < 2 ? "high" : "auto"}
								className="w-full h-full object-cover"
								style={{
									objectPosition: "center",
								}}
							/>
						</div>
					</div>
				))}
			</div>

			{/* Gradient overlays for text readability */}
			<div
				className="absolute inset-0 z-5 pointer-events-none"
				style={{
					opacity: 0,
					background:
						"linear-gradient(to right, rgba(248, 248, 248, 0.2) 0%, rgba(248, 248, 248, 0.1) 50%, rgba(248, 248, 248, 0.2) 100%)",
				}}
			/>
			<div
				className="absolute inset-0 z-5 pointer-events-none"
				style={{
					opacity: 0,
					background:
						"radial-gradient(ellipse at center, rgba(248, 248, 248, 0.2) 0%, transparent 70%)",
				}}
			/>

			{/* Text Content */}
			<div ref={textRef} className="relative z-10 text-center">
				<h2
					className="font-montserrat font-bold uppercase leading-[1.2] sm:leading-[1.2]
						text-4xl sm:text-5xl lg:text-6xl
						tracking-[3px] sm:tracking-[5px] lg:tracking-[8px]"
					style={{
						color: "#0A0A0A",
						textShadow: "0 2px 20px rgba(248, 248, 248, 0.8)",
					}}>
					POINT YOUR PHONE.
				</h2>
				<h2
					className="font-montserrat font-semibold uppercase leading-[1.2] sm:leading-[1.2]
						text-[36px] sm:text-[64px] lg:text-8xl
						tracking-[3px] sm:tracking-[5px] lg:tracking-[8px]
						mt-2 sm:mt-4"
					style={{
						color: "#0A0A0A",
						textShadow: "0 2px 20px rgba(248, 248, 248, 0.8)",
					}}>
					WATCH CENTURIES UNFOLD.
				</h2>
			</div>
		</section>
	);
};

export default PowerStatement;
