"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PixelCard from "../PixelCard";
import TiltedCard from "../TiltedCard";
import LiquidEther from "../LiquidEther";
import TextType from "../TextType";

gsap.registerPlugin(ScrollTrigger);

const Solution = () => {
	const sectionRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const ctx = gsap.context(() => {
			// Initial state - scaled down and transparent
			gsap.set(section, {
				scale: 0.8,
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
					start: "top 90%", // Start earlier to reduce white space
					end: "top 30%",
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
			className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-10">
			{/* Background LiquidEther */}

			<h2 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-semibold text-white text-center font-montserrat mb-8 sm:mb-12 md:mb-16">
				History Meets Technology
			</h2>

			{/* Mobile Version - Stacked Cards */}
			<div className="lg:hidden relative z-10 w-full max-w-md mx-auto space-y-8">
				{/* Card 1 - Mobile */}
				<div className="flex flex-col items-center">
					<div className="w-full aspect-[3/4] max-w-[320px]">
						<video
							src="/cap.mp4"
							autoPlay
							loop
							muted
							playsInline
							preload="auto"
							className="w-full h-full object-cover rounded-2xl shadow-xl"
						/>
					</div>
					<p className="text-gray-400 text-sm mt-4 text-center px-4">
						Point your camera at any historical site
					</p>
				</div>

				{/* Card 2 - Mobile */}
				<div className="flex flex-col items-center">
					<div className="w-full aspect-[3/4] max-w-[320px]">
						<video
							src="/cap2.mp4"
							autoPlay
							loop
							muted
							playsInline
							preload="auto"
							className="w-full h-full object-cover rounded-2xl shadow-xl"
						/>
					</div>
					<p className="text-gray-400 text-sm mt-4 text-center px-4">
						Explore immersive historical experiences
					</p>
				</div>

				{/* Card 3 - Mobile */}
				<div className="flex flex-col items-center">
					<div className="w-full aspect-[3/4] max-w-[320px]">
						<video
							src="/cap4.mp4"
							autoPlay
							loop
							muted
							playsInline
							preload="auto"
							className="w-full h-full object-cover rounded-2xl shadow-xl"
						/>
					</div>
					<p className="text-gray-400 text-sm mt-4 text-center px-4">
						AI Tells Your Story
					</p>
				</div>
			</div>

			{/* Desktop Version - Three Cards Side by Side */}
			<div className="hidden lg:flex relative z-10 items-center justify-around gap-8 w-full max-w-7xl">
				{/* Card 1 - Desktop */}
				<div className="flex flex-col items-center">
					<div className="w-[350px] h-[500px]">
						<TiltedCard
							imageSrc="/cap.mp4"
							altText="Point your camera"
							captionText="Scan historical sites"
							containerHeight="500px"
							containerWidth="350px"
							imageHeight="500px"
							imageWidth="350px"
							scaleOnHover={1.08}
							rotateAmplitude={12}
							showMobileWarning={false}
							showTooltip={true}
							isVideo={true}
						/>
					</div>
					<p className="text-gray-400 text-sm mt-6 text-center max-w-[320px]">
						Point your camera at any historical site
					</p>
				</div>

				{/* Card 2 - Desktop */}
				<div className="flex flex-col items-center">
					<div className="w-[350px] h-[500px]">
						<TiltedCard
							imageSrc="/cap2.mp4"
							altText="AR Reconstruction"
							captionText="Watch history come alive"
							containerHeight="500px"
							containerWidth="350px"
							imageHeight="500px"
							imageWidth="350px"
							scaleOnHover={1.08}
							rotateAmplitude={12}
							showMobileWarning={false}
							showTooltip={true}
							isVideo={true}
						/>
					</div>
					<p className="text-gray-400 text-sm mt-6 text-center max-w-[320px]">
						Explore immersive historical experiences
					</p>
				</div>

				{/* Card 3 - Desktop */}
				<div className="flex flex-col items-center">
					<div className="w-[350px] h-[500px]">
						<TiltedCard
							imageSrc="/cap4.mp4"
							altText="AI Stories"
							captionText="Discover your story"
							containerHeight="500px"
							containerWidth="350px"
							imageHeight="500px"
							imageWidth="350px"
							scaleOnHover={1.08}
							rotateAmplitude={12}
							showMobileWarning={false}
							showTooltip={true}
							isVideo={true}
						/>
					</div>
					<p className="text-gray-400 text-sm mt-6 text-center max-w-[320px]">
						AI Tells Your Story
					</p>
				</div>
			</div>
		</div>
	);
};

export default Solution;
