import React, { useState, useEffect } from "react";
import LiquidEther from "../LiquidEther";
import ShinyText from "../ShinyText";
import Navbar from "./Navbar";
import { ArrowUpIcon, Download } from "lucide-react";

const Hero = () => {
	const [timeLeft, setTimeLeft] = useState({
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0,
	});

	const [showScrollIndicator, setShowScrollIndicator] = useState(false);

	useEffect(() => {
		// Calculate launch date (60 days from October 28, 2025)
		const launchDate = new Date("December 31, 2025 00:00:00").getTime();

		const updateCountdown = () => {
			const now = new Date().getTime();
			const difference = launchDate - now;

			if (difference > 0) {
				setTimeLeft({
					days: Math.floor(difference / (1000 * 60 * 60 * 24)),
					hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
					minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
					seconds: Math.floor((difference % (1000 * 60)) / 1000),
				});
			}
		};

		updateCountdown();
		const timer = setInterval(updateCountdown, 1000);

		return () => clearInterval(timer);
	}, []);

	useEffect(() => {
		const handleMouseMove = (e) => {
			// Show indicator when mouse is in the bottom 20% of the viewport
			const bottomThreshold = window.innerHeight * 0.8;
			setShowScrollIndicator(e.clientY > bottomThreshold);
		};

		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	return (
		<div className="relative flex justify-center items-center m-auto bg-black h-screen overflow-hidden">
			{/* Background LiquidEther */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto">
				<LiquidEther
					colors={["#fff", "#fff", "#fff"]}
					mouseForce={20}
					cursorSize={90}
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

			{/* Navbar at the top - full height within Hero */}
			<div className="absolute inset-0 z-50 pointer-events-none">
				<Navbar />
			</div>

			{/* Content Layer */}
			<div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto font-montserrat flex flex-col items-center justify-center h-full">
				<p className="text-xs sm:text-sm md:text-lg text-gray-400 font-sans font-light">
					Turn Your Smartphone Into a Time Machine
				</p>
				<ShinyText
					text="Epocheye"
					disabled={false}
					speed={2}
					className="text-5xl sm:text-6xl md:text-8xl font-semibold text-white mb-6 leading-tight"
				/>

				<button
					className="my-8 sm:my-10 px-5 sm:px-6 py-1 border border-white text-white text-sm sm:text-base rounded-full hover:bg-white hover:text-black transition duration-300 pointer-events-auto flex items-center gap-2 sm:gap-3 cursor-pointer"
					onClick={() => console.log("Button Clicked")}>
					<Download
						size={36}
						className="bg-white text-black rounded-full p-2 -ml-4 sm:-ml-5"
					/>
					Join the waitlist
				</button>

				{/* Countdown Timer */}
				<div className="pointer-events-none mt-6 sm:mt-8">
					<p className="text-gray-400 text-xs sm:text-sm md:text-base mb-2 font-light">
						Launching in
					</p>
					<div className="text-lg sm:text-xl md:text-3xl font-light text-white tracking-widest">
						{timeLeft.days}d : {timeLeft.hours}h : {timeLeft.minutes}m :{" "}
						{timeLeft.seconds}s
					</div>
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
