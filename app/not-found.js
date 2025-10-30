"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LiquidEther from "@/components/LiquidEther";
import ShinyText from "@/components/ShinyText";
import { ArrowLeft, Home, Clock } from "lucide-react";

export default function NotFound() {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [isHovering, setIsHovering] = useState(false);
	const [stars, setStars] = useState([]);

	useEffect(() => {
		// Generate stars only on client side to avoid hydration mismatch
		const generatedStars = [...Array(20)].map((_, i) => ({
			id: i,
			left: Math.random() * 100,
			top: Math.random() * 100,
			animationDelay: Math.random() * 3,
			animationDuration: 2 + Math.random() * 3,
			opacity: Math.random() * 0.5,
		}));
		setStars(generatedStars);
	}, []);

	useEffect(() => {
		const handleMouseMove = (e) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden">
			{/* Background LiquidEther Effect */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto opacity-30">
				<LiquidEther
					colors={["#fff", "#fff", "#fff"]}
					mouseForce={15}
					cursorSize={80}
					isViscous={false}
					viscous={30}
					iterationsViscous={32}
					iterationsPoisson={32}
					resolution={0.5}
					isBounce={false}
					autoDemo={true}
					autoSpeed={0.3}
					autoIntensity={1.5}
					takeoverDuration={0.25}
					autoResumeDelay={3000}
					autoRampDuration={0.6}
				/>
			</div>

			{/* Floating particles effect */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{stars.map((star) => (
					<div
						key={star.id}
						className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
						style={{
							left: `${star.left}%`,
							top: `${star.top}%`,
							animationDelay: `${star.animationDelay}s`,
							animationDuration: `${star.animationDuration}s`,
							opacity: star.opacity,
						}}
					/>
				))}
			</div>

			{/* Gradient Orbs */}
			<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "1s" }} />

			{/* Main Content */}
			<div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
				{/* Glitch 404 */}
				<div className="mb-8 relative">
					<h1 className="text-[clamp(6rem,20vw,14rem)] font-black text-white montserrat-alternates-black tracking-tight relative select-none">
						<span className="relative inline-block">
							<span className="relative z-10">404</span>
							<span className="absolute top-0 left-0 w-full h-full text-red-500 animate-glitch-1" aria-hidden="true">404</span>
							<span className="absolute top-0 left-0 w-full h-full text-cyan-500 animate-glitch-2" aria-hidden="true">404</span>
						</span>
					</h1>
				</div>

				{/* Lost in Time Message */}
				<div className="space-y-6 mb-12">
					<div className="flex items-center justify-center gap-3 mb-4">
						<Clock className="w-6 h-6 text-gray-400 animate-spin" style={{ animationDuration: "3s" }} />
						<h1 className="text-2xl sm:text-3xl md:text-4xl montserrat-alternates-bold text-white">
							Lost in Time
						</h1>
						<Clock className="w-6 h-6 text-gray-400 animate-spin" style={{ animationDuration: "3s", animationDirection: "reverse" }} />
					</div>
					
					<ShinyText
						text="This moment doesn't exist... yet"
						disabled={false}
						speed={3}
						className="text-xl sm:text-2xl md:text-3xl montserrat-alternates-medium text-gray-300 mb-4"
					/>
					
					<p className="text-base sm:text-lg text-gray-500 montserrat-alternates-regular max-w-2xl mx-auto leading-relaxed">
						The page you're looking for hasn't been written into existence. 
						Perhaps it's waiting in another timeline, or maybe it never existed at all.
					</p>
				</div>

				{/* Action Buttons */}
				<div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
					<Link
						href="/"
						onMouseEnter={() => setIsHovering(true)}
						onMouseLeave={() => setIsHovering(false)}
						className="group relative px-8 py-4 bg-white text-black montserrat-alternates-semibold rounded-full hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-white/20 flex items-center gap-3 pointer-events-auto"
					>
						<Home className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
						Return to Reality
						<div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />
					</Link>
					
					<button
						onClick={() => window.history.back()}
						className="group px-8 py-4 border-2 border-white/30 text-white montserrat-alternates-semibold rounded-full hover:bg-white/10 hover:border-white transition-all duration-300 transform hover:scale-105 backdrop-blur-sm flex items-center gap-3 pointer-events-auto"
					>
						<ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
						Go Back in Time
					</button>
				</div>

				{/* Decorative Bottom Section */}
				<div className="space-y-6 pointer-events-none">
					<div className="w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
					
					<div className="flex items-center justify-center gap-2 text-gray-600 text-sm montserrat-alternates-light">
						<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
						<span>Error Code: TEMPORAL_ANOMALY_404</span>
						<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
					</div>
				</div>
			</div>

			{/* Custom cursor trail effect */}
			<div
				className="pointer-events-none fixed w-8 h-8 border border-white/30 rounded-full mix-blend-difference transition-transform duration-200 ease-out z-50"
				style={{
					left: `${mousePosition.x}px`,
					top: `${mousePosition.y}px`,
					transform: `translate(-50%, -50%) ${isHovering ? 'scale(1.5)' : 'scale(1)'}`,
				}}
			/>
		</div>
	);
}
