import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./Navbar";
import ShinyText from "../ShinyText";
import { ArrowRight } from "lucide-react";

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
				{/* Permanent dark overlay for text visibility */}
				<div className="absolute inset-0 bg-black/30" />
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
							className="text-white/70 text-lg mt-4 font-medium tracking-wide font-montserrat"
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

			{/* Content Layer - Minimalist Design */}
			<motion.div
				className="relative z-10 text-center px-6 max-w-3xl mx-auto font-montserrat flex flex-col items-center justify-center h-full"
				initial={{ opacity: 0 }}
				animate={{ opacity: introPhase === "complete" ? 1 : 0 }}
				transition={{ duration: 1.2, delay: 0.2 }}>
				{/* Single Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{
						opacity: introPhase === "complete" ? 1 : 0,
						y: introPhase === "complete" ? 0 : 20,
					}}
					transition={{ duration: 1, delay: 0.4 }}
					className="text-4xl sm:text-5xl md:text-6xl font-light text-white leading-[1.15] tracking-tight">
					Rediscover heritage.
					<br />
					<span className="font-semibold">Reimagine travel.</span>
				</motion.h1>

				{/* Minimal Subtext */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{
						opacity: introPhase === "complete" ? 0.6 : 0,
					}}
					transition={{ duration: 1, delay: 0.7 }}
					className="text-white text-xl sm:text-lg font-medium mt-8">
					Historical intelligence for the physical world
				</motion.p>

				{/* Single CTA */}
				<motion.button
					initial={{ opacity: 0 }}
					animate={{
						opacity: introPhase === "complete" ? 1 : 0,
					}}
					transition={{ duration: 1, delay: 1 }}
					className="group mt-12 px-8 py-4 border border-white/30 text-white rounded-full text-sm font-semibold cursor-pointer tracking-wider uppercase hover:bg-white hover:text-black transition-all duration-500 pointer-events-auto flex items-center gap-3"
					data-tally-open="mVR7OJ"
					data-tally-layout="modal"
					data-tally-width="600"
					data-tally-auto-close="1000"
					data-tally-form-events-forwarding="1">
					Join Waitlist
					<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
				</motion.button>
			</motion.div>

			{/* Minimal Scroll Indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: introPhase === "complete" ? 0.5 : 0 }}
				transition={{ duration: 1, delay: 1.5 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
				<div className="w-px h-12 bg-linear-to-b from-transparent via-white to-transparent" />
			</motion.div>
		</div>
	);
};

export default Hero;
