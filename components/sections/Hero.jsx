import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./Navbar";
import ShinyText from "../ShinyText";

const Hero = () => {
	const [showScrollIndicator, setShowScrollIndicator] = useState(false);
	const [introPhase, setIntroPhase] = useState("intro"); // "intro" | "transition" | "complete"
	const [navbarPosition, setNavbarPosition] = useState({ top: 28 }); // Target position in navbar

	// Start intro sequence after mount
	useEffect(() => {
		// Initial delay before starting transition
		const introTimer = setTimeout(() => {
			setIntroPhase("transition");
		}, 3000); // Show centered text for 2 seconds

		return () => clearTimeout(introTimer);
	}, []);

	// Handle transition completion
	const handleTransitionComplete = () => {
		if (introPhase === "transition") {
			setIntroPhase("complete");
		}
	};

	// Skip intro on click
	const handleSkipIntro = () => {
		if (introPhase !== "complete") {
			setIntroPhase("complete");
		}
	};

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
		<div
			className="relative flex justify-center items-center m-auto bg-black h-screen overflow-hidden"
			onClick={handleSkipIntro}>
			{/* Background LiquidEther - Optimized with lower resolution */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto">
				<video
					className="absolute inset-0 w-full h-full object-cover"
					src="/bg_vid.mp4"
					autoPlay
					loop
					muted
					playsInline
				/>
			</div>

			{/* Navbar at the top - full height within Hero */}
			<div className="absolute inset-0 z-50 pointer-events-none">
				<Navbar showLogo={introPhase === "complete"} />
			</div>

			{/* Dark Overlay - Visible during intro phase */}
			<AnimatePresence>
				{introPhase === "intro" && (
					<motion.div
						className="absolute inset-0 z-30 bg-black/60 pointer-events-none"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.8, ease: "easeOut" }}
					/>
				)}
			</AnimatePresence>

			{/* Animated Intro Text */}
			<AnimatePresence>
				{introPhase !== "complete" && (
					<motion.div
						className="absolute z-40 flex flex-col items-center justify-center pointer-events-none font-montserrat"
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
							top: introPhase === "intro" ? "50%" : navbarPosition.top,
							y: introPhase === "intro" ? "-50%" : 0,
						}}
						exit={{ opacity: 0 }}
						transition={{
							top: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
							y: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
							opacity: { duration: 0.3 },
						}}
						onAnimationComplete={handleTransitionComplete}
						style={{
							left: "50%",
							x: "-50%",
						}}>
						{/* Epocheye Title */}
						<motion.div
							animate={{
								scale: introPhase === "intro" ? 1.5 : 1,
							}}
							transition={{
								duration: 1.2,
								ease: [0.22, 1, 0.36, 1],
							}}>
							<ShinyText
								text="Epocheye"
								disabled={false}
								speed={2}
								className="text-3xl font-bold text-white leading-tight font-montserrat"
							/>
						</motion.div>

						{/* Tagline - Fades out during transition */}
						<motion.p
							className="text-white/70 text-lg mt-4 font-light tracking-wide font-montserrat"
							initial={{ opacity: 0, y: 20 }}
							animate={{
								opacity: introPhase === "intro" ? 1 : 0,
								y: introPhase === "intro" ? 0 : -20,
							}}
							transition={{
								duration: 0.8,
								delay: introPhase === "intro" ? 0.5 : 0,
								ease: "easeOut",
							}}>
							Experience Heritage through Tech
						</motion.p>
					</motion.div>
				)}
			</AnimatePresence>

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
