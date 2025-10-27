"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Solution = () => {
	const sectionRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const ctx = gsap.context(() => {
			// Initial state - scaled down and transparent
			gsap.set(section, {
				scale: 0.5,
				opacity: 0,
			});

			// Zoom in animation
			gsap.to(section, {
				scale: 1,
				opacity: 1,
				duration: 1,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 80%",
					end: "top 20%",
					scrub: 1,
					markers: false,
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<div
			ref={sectionRef}
			className="relative w-full h-screen flex items-center justify-center bg-black overflow-hidden">
			<h2 className="text-lg md:text-3xl lg:text-5xl font-medium text-white text-center font-montserrat">
				History Meets Technology
			</h2>
		</div>
	);
};

export default Solution;
