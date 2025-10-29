"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PixelCard from "../PixelCard";
import TiltedCard from "../TiltedCard";
import LiquidEther from "../LiquidEther";

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
			className="relative w-full min-h-screen flex flex-col items-center justify-center bg-black overflow-hidden pb-10 px-6">
			{/* Background LiquidEther */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto">
				<LiquidEther
					colors={["#fff", "#fff", "#fff"]}
					mouseForce={20}
					cursorSize={80}
					isViscous={false}
					viscous={30}
					iterationsViscous={32}
					iterationsPoisson={32}
					resolution={0.5}
					isBounce={false}
					autoDemo={true}
					autoSpeed={0.5}
					autoIntensity={2.2}
					takeoverDuration={0.25}
					autoResumeDelay={3000}
					autoRampDuration={0.6}
				/>
			</div>

			<h2 className="relative z-10 text-xl md:text-3xl font-semibold text-white text-center font-montserrat my-20">
				History Meets Technology
			</h2>

			{/* Three Cards Side by Side */}
			<div className="relative z-10 flex flex-col lg:flex-row items-center justify-around gap-10 w-full">
				{/* Card 1 - TiltedCard with Video */}
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

				{/* Card 2 - TiltedCard with Video */}
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

				{/* Card 3 - TiltedCard with Video */}
				<div className="flex flex-col items-center">
					<div className="w-[400px] h-[500px]">
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

			{/* Additional Feature Sections */}
			<div className="relative z-10 w-full max-w-7xl mt-32 space-y-24">
				{/* Section 1 - Aerial View with AR Data Overlay */}
				<div className="flex flex-col items-center">
					<div className="w-full max-w-6xl bg-linear-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
						<div className="relative aspect-video bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden">
							{/* Simulated Aerial Background */}
							<div className="absolute inset-0 bg-gradient-radial from-slate-700/30 via-slate-800 to-slate-900" />

							{/* Heatmap Overlay Zones */}
							<div className="absolute top-1/4 left-1/3 w-32 h-32 bg-green-500/40 blur-2xl rounded-full animate-pulse" />
							<div
								className="absolute top-1/3 right-1/4 w-40 h-40 bg-yellow-500/50 blur-2xl rounded-full animate-pulse"
								style={{ animationDelay: "0.3s" }}
							/>
							<div
								className="absolute bottom-1/4 left-1/4 w-36 h-36 bg-red-500/60 blur-2xl rounded-full animate-pulse"
								style={{ animationDelay: "0.6s" }}
							/>

							{/* AR Data Overlays */}
							{/* Graph Bars */}
							<div className="absolute bottom-8 left-8 flex items-end gap-2">
								{[60, 80, 95, 70, 50, 65].map((height, i) => (
									<div
										key={i}
										className="flex flex-col items-center gap-1">
										<div
											className="w-6 bg-linear-to-t from-cyan-500 to-blue-400 rounded-t transition-all duration-1000 ease-out"
											style={{
												height: `${height}px`,
												animation: `slideUp 2s ease-out ${
													i * 0.1
												}s both`,
											}}
										/>
										<span className="text-[8px] text-white/60">
											{9 + i}AM
										</span>
									</div>
								))}
							</div>

							{/* Calendar Widget */}
							<div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md rounded-lg p-3 border border-cyan-500/30">
								<div className="text-xs text-cyan-400 font-semibold mb-2">
									Best Times
								</div>
								<div className="grid grid-cols-3 gap-1">
									{["M", "T", "W", "T", "F", "S", "S"]
										.slice(0, 6)
										.map((day, i) => (
											<div
												key={i}
												className={`w-6 h-6 rounded text-[10px] flex items-center justify-center ${
													i === 1 || i === 4
														? "bg-green-500/30 text-green-400 border border-green-500/50"
														: "bg-gray-700/50 text-gray-500"
												}`}>
												{day}
											</div>
										))}
								</div>
							</div>

							{/* Analytics Dashboard Labels */}
							<div className="absolute top-6 left-6 space-y-2">
								<div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-green-500/30 flex items-center gap-2">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
									<span className="text-xs text-green-400">
										Low Crowd
									</span>
								</div>
								<div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-yellow-500/30 flex items-center gap-2">
									<div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
									<span className="text-xs text-yellow-400">Medium</span>
								</div>
								<div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 border border-red-500/30 flex items-center gap-2">
									<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
									<span className="text-xs text-red-400">
										High Crowd
									</span>
								</div>
							</div>

							{/* Scanning Lines Effect */}
							<div
								className="absolute inset-0 bg-linear-to-b from-transparent via-cyan-500/10 to-transparent h-full animate-scan"
								style={{ animation: "scan 3s linear infinite" }}
							/>
						</div>
						<h3 className="text-2xl md:text-3xl font-semibold text-white text-center mt-6">
							Smart Crowd Analytics
						</h3>
						<p className="text-gray-400 text-center mt-3 max-w-2xl mx-auto">
							Real-time heatmaps and crowd data help you plan the perfect visit
						</p>
					</div>
				</div>

				{/* Section 2 - Holographic UI Interface */}
				<div className="flex flex-col items-center">
					<div className="w-full max-w-6xl bg-linear-to-br from-blue-900/30 to-purple-900/20 backdrop-blur-sm rounded-3xl border border-blue-500/20 p-8 shadow-2xl">
						<div className="relative aspect-video bg-linear-to-br from-slate-950 via-blue-950/50 to-purple-950/30 rounded-2xl overflow-hidden flex items-center justify-center">
							{/* Ambient Glow Effects */}
							<div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/30 blur-3xl rounded-full animate-pulse" />
							<div
								className="absolute bottom-0 right-1/4 w-64 h-64 bg-yellow-500/20 blur-3xl rounded-full animate-pulse"
								style={{ animationDelay: "0.5s" }}
							/>
							<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 blur-3xl rounded-full" />

							{/* Holographic Category Cards */}
							<div className="relative z-10 grid grid-cols-2 gap-6 p-8">
								{[
									{
										name: "Architecture",
										icon: "🏛️",
										color: "blue",
										delay: "0s",
									},
									{
										name: "Battles",
										icon: "⚔️",
										color: "red",
										delay: "0.1s",
									},
									{
										name: "Romance",
										icon: "💝",
										color: "pink",
										delay: "0.2s",
									},
									{
										name: "Culture",
										icon: "🎭",
										color: "yellow",
										delay: "0.3s",
									},
								].map((category, i) => (
									<div
										key={i}
										className={`relative group cursor-pointer transform transition-all duration-500 hover:scale-110 hover:-translate-y-2`}
										style={{ animationDelay: category.delay }}>
										{/* Card Glow */}
										<div
											className={`absolute inset-0 bg-${category.color}-500/20 blur-xl rounded-2xl group-hover:bg-${category.color}-400/40 transition-all duration-500`}
										/>

										{/* Card Content */}
										<div
											className={`relative bg-linear-to-br from-slate-800/80 to-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-${category.color}-500/30 group-hover:border-${category.color}-400/60 transition-all duration-500 shadow-xl`}>
											<div className="text-4xl mb-3 transform group-hover:scale-125 transition-transform duration-500">
												{category.icon}
											</div>
											<div
												className={`text-lg font-semibold text-${category.color}-400 group-hover:text-${category.color}-300 transition-colors`}>
												{category.name}
											</div>
											{/* Holographic Scan Line */}
											<div className="absolute inset-0 bg-linear-to-b from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 animate-scan-fast rounded-2xl" />
										</div>

										{/* Corner Accents */}
										<div
											className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-${category.color}-500/50 group-hover:border-${category.color}-400 transition-colors`}
										/>
										<div
											className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-${category.color}-500/50 group-hover:border-${category.color}-400 transition-colors`}
										/>
									</div>
								))}
							</div>

							{/* Hand Indicator (Bottom Right) */}
							<div
								className="absolute bottom-12 right-12 text-6xl animate-bounce opacity-60"
								style={{ animationDuration: "2s" }}>
								👆
							</div>

							{/* Particle Effects */}
							{[...Array(12)].map((_, i) => (
								<div
									key={i}
									className="absolute w-1 h-1 bg-blue-400/60 rounded-full animate-float"
									style={{
										left: `${Math.random() * 100}%`,
										top: `${Math.random() * 100}%`,
										animationDelay: `${Math.random() * 3}s`,
										animationDuration: `${3 + Math.random() * 2}s`,
									}}
								/>
							))}
						</div>
						<h3 className="text-2xl md:text-3xl font-semibold text-white text-center mt-6">
							AI-Powered Personalization
						</h3>
						<p className="text-gray-400 text-center mt-3 max-w-2xl mx-auto">
							Choose your interests and let AI curate your perfect historical
							journey
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Solution;
