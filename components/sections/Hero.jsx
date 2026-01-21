import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ShinyText from "../ShinyText";
import Navbar from "./Navbar";
import { Download } from "lucide-react";
import LightPillar from "../LightPillar";

// Lazy load LiquidEther with lower priority
const LiquidEther = dynamic(() => import("../LiquidEther"), {
	loading: () => <div className="absolute inset-0 w-full h-full bg-black" />,
	ssr: false,
});

const Hero = () => {
	const [showScrollIndicator, setShowScrollIndicator] = useState(false);
	// Use throttled mouse move handler for better performance
	useEffect(() => {
		let timeoutId;
		const handleMouseMove = (e) => {
			if (timeoutId) return;

			timeoutId = setTimeout(() => {
				// Show indicator when mouse is in the bottom 20% of the viewport
				const bottomThreshold = window.innerHeight * 0.8;
				setShowScrollIndicator(e.clientY > bottomThreshold);
				timeoutId = null;
			}, 100);
		};

		window.addEventListener("mousemove", handleMouseMove, { passive: true });

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, []);

	return (
		<div className="relative flex justify-center items-center m-auto bg-black h-screen overflow-hidden">
			{/* Background LiquidEther - Optimized with lower resolution */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto">
				<LightPillar
					topColor="#3d0fe6"
					bottomColor="#f8f7f8"
					intensity={1}
					rotationSpeed={0.5}
					glowAmount={0.001}
					pillarWidth={3}
					pillarHeight={0.4}
					noiseIntensity={0.5}
					pillarRotation={85}
					interactive={false}
					mixBlendMode="screen"
					quality="high"
				/>
			</div>

			{/* Navbar at the top - full height within Hero */}
			<div className="absolute inset-0 z-50 pointer-events-none">
				<Navbar />
			</div>

			{/* Content Layer */}
			<div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto font-montserrat flex flex-col items-center justify-center h-full gap-4"></div>

			{/* Scroll Indicator - Bottom Center */}
			{/* <div
				className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-500 ease-out ${
					showScrollIndicator ? "opacity-100 scale-100" : "opacity-0 scale-50"
				}`}>
				<div className="relative flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-2 border-white/40 shadow-2xl">
					<svg
						className="w-6 h-6 text-white animate-bounce"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						/>
					</svg>
				</div>
			</div> */}
		</div>
	);
};

export default Hero;
