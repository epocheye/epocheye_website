"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CredibilityStatement = () => {
	const sectionRef = useRef(null);
	const headlineRef = useRef(null);
	const textRef = useRef(null);
	const videoRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		const headline = headlineRef.current;
		const text = textRef.current;
		const video = videoRef.current;

		if (!section || !headline || !text) return;

		// Play video when in view
		if (video) {
			video.play().catch(() => {});
		}

		const ctx = gsap.context(() => {
			// Headline animation
			gsap.set(headline, {
				opacity: 0,
				scale: 0.97,
			});

			gsap.to(headline, {
				opacity: 1,
				scale: 1,
				duration: 0.8,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					toggleActions: "play none none reverse",
				},
			});

			// Text animation (delayed)
			gsap.set(text, {
				opacity: 0,
				y: 30,
			});

			gsap.to(text, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				delay: 0.2,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					toggleActions: "play none none reverse",
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="yz-section yz-section-dark relative flex items-center justify-center overflow-hidden
				px-5 sm:px-10 lg:px-20 py-20 sm:py-24 lg:py-[120px]"
			style={{ backgroundColor: "#0A0000" }}>
			{/* Video Background */}
			<video
				ref={videoRef}
				className="absolute inset-0 w-full h-full object-cover"
				src="/bg_2.mp4"
				autoPlay
				loop
				muted
				playsInline
				style={{ opacity: 1 }}
			/>

			{/* Dark Overlay for readability */}
			<div
				className="absolute inset-0 z-1"
				style={{
					background:
						"linear-gradient(to bottom, rgba(10, 10, 10, 0.3) 0%, rgba(10, 10, 10, 0.4) 50%, rgba(10, 10, 10, 0.5) 100%)",
				}}
			/>

			{/* Vignette effect */}
			<div
				className="absolute inset-0 z-[2] pointer-events-none"
				style={{
					background:
						"radial-gradient(ellipse at center, transparent 30%, rgba(10, 10, 10, 0.3) 100%)",
				}}
			/>

			<div className="relative z-[3] max-w-[900px] text-center">
				{/* Main Headline */}
				<h2
					ref={headlineRef}
					className="font-montserrat font-bold uppercase text-white leading-[1.2]
						text-[28px] sm:text-[40px] lg:text-[60px]
						tracking-[2px] sm:tracking-[4px] lg:tracking-[6px]"
					style={{ textShadow: "0 4px 30px rgba(0, 0, 0, 0.5)" }}>
					VERIFIED. TRUSTED. HISTORICALLY ACCURATE.
				</h2>

				{/* Supporting Text */}
				<div ref={textRef} className="mt-10 sm:mt-12 lg:mt-16">
					<p
						className="font-light leading-[1.7]
							text-[16px] sm:text-[18px] lg:text-[20px]
							tracking-[1px] sm:tracking-[1.5px] lg:tracking-[2px]"
						style={{ color: "#D0D0D0" }}>
						EpochEye integrates a verified creator and historian network. Trusted
						institutions and experts publish reconstructions distributed globally.
					</p>

					<p
						className="mt-8 sm:mt-10 font-light leading-[1.7]
							text-[16px] sm:text-[18px] lg:text-[20px]
							tracking-[1px] sm:tracking-[1.5px] lg:tracking-[2px]"
						style={{ color: "#D0D0D0" }}>
						This is not user-generated trivia.{" "}
						<span className="font-semibold text-white">
							This is historical intelligence.
						</span>
					</p>
				</div>
			</div>
		</section>
	);
};

export default CredibilityStatement;
