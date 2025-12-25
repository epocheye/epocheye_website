import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ShinyText from "../ShinyText";
import Navbar from "./Navbar";
import { Download } from "lucide-react";

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
				<LiquidEther
					colors={["#fff", "#fff", "#fff"]}
					mouseForce={15}
					cursorSize={50}
					isViscous={false}
					viscous={30}
					iterationsViscous={16}
					iterationsPoisson={16}
					resolution={0.3}
					isBounce={false}
					autoDemo={true}
					autoSpeed={0.4}
					autoIntensity={1.8}
					takeoverDuration={0.2}
					autoResumeDelay={3000}
					autoRampDuration={0.5}
				/>
			</div>

			{/* Navbar at the top - full height within Hero */}
			<div className="absolute inset-0 z-50 pointer-events-none">
				<Navbar />
			</div>

			{/* Content Layer */}
			<div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto font-montserrat flex flex-col items-center justify-center h-full gap-4">
				<p className="text-xs sm:text-sm md:text-lg text-gray-400 font-sans font-light">
					Turn Your Smartphone Into a Time Machine
				</p>

				<ShinyText
					text="Epocheye"
					disabled={false}
					speed={2}
					className="text-5xl sm:text-6xl md:text-8xl font-semibold text-white mb-2 leading-tight"
				/>

				<button
					title="Get 1 month free + exclusive beta perks"
					className="my-6 sm:my-8 px-6 sm:px-8 py-3 border border-white/80 text-white text-sm sm:text-base rounded-full hover:bg-white hover:text-black transition duration-300 pointer-events-auto flex items-center gap-3 cursor-pointer shadow-lg shadow-white/10"
					data-tally-open="mVR7OJ"
					data-tally-layout="modal"
					data-tally-width="600"
					data-tally-auto-close="1000"
					data-tally-form-events-forwarding="1">
					<Download
						size={36}
						className="bg-white text-black rounded-full p-2 -ml-2"
					/>
					Reserve Your Early Access - Get 1 Month Free
				</button>

				<div className="flex items-center gap-3 text-xs sm:text-sm text-gray-200 font-sans">
					<div className="flex -space-x-2">
						<span
							className="w-8 h-8 rounded-full bg-white/80 border border-black/10"
							aria-hidden="true"
						/>
						<span
							className="w-8 h-8 rounded-full bg-white/60 border border-black/10"
							aria-hidden="true"
						/>
						<span
							className="w-8 h-8 rounded-full bg-white/40 border border-black/10"
							aria-hidden="true"
						/>
					</div>
					<span className="font-light">
						Join 5,000+ history enthusiasts already signed up
					</span>
				</div>

				<a
					href="#how-it-works"
					className="mt-3 text-sm text-gray-300 underline decoration-dotted decoration-gray-500 hover:text-white">
					See How It Works
				</a>

				{/* Countdown Timer */}
				<div className="pointer-events-none mt-6 sm:mt-7 bg-white/5 px-4 py-3 rounded-full border border-white/10 backdrop-blur">
					<p className="text-gray-300 text-xs sm:text-sm md:text-base font-medium tracking-wide">
						Launch in Early 2026
					</p>
				</div>
			</div>

			{/* Scroll Indicator - Bottom Center */}
			<div
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
			</div>
		</div>
	);
};

export default Hero;
