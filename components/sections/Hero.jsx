import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import Navbar from "./Navbar";
import ShinyText from "../ShinyText";
import googlePlayBadge from "../../public/google-play-badge.png";
import { PREORDER_PRICE, formatPrice } from "@/lib/preorder/price";

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
			<div
				className="absolute inset-0 w-full h-full pointer-events-auto"
				aria-hidden="true">
				<video
					className="absolute inset-0 w-full h-full object-cover"
					autoPlay
					loop
					muted
					playsInline
					preload="metadata"
					aria-hidden="true">
					<source src="/bg_vid.webm" type="video/webm" />
					<source src="/bg_vid.mp4" type="video/mp4" />
				</video>
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
								scale: introPhase === "intro" ? 1.2 : 1,
							}}
							transition={{
								duration: 1.2,
								ease: [0.22, 1, 0.36, 1],
							}}>
							<ShinyText
								text="Epocheye"
								disabled={false}
								speed={2}
								className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight font-montserrat"
							/>
						</motion.div>

						{/* Tagline - Fades out during transition */}
						<motion.p
							className="text-white/70 text-sm sm:text-base md:text-lg mt-3 sm:mt-4 font-medium tracking-wide font-montserrat text-center"
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
				className="relative z-10 text-center px-4 sm:px-6 md:px-8 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto font-montserrat flex flex-col items-center justify-center h-full"
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
					className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.15] tracking-tight">
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
					className="text-white text-base sm:text-lg md:text-xl font-medium mt-6 sm:mt-8">
					Historical intelligence for the physical world
				</motion.p>

				{/* CTA — live on Google Play, and pre-orders for the next site */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{
						opacity: introPhase === "complete" ? 1 : 0,
						y: introPhase === "complete" ? 0 : 20,
					}}
					transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
					className="mt-8 sm:mt-12 flex flex-col items-center gap-5 sm:gap-6">
					<a
						href="https://play.google.com/store/apps/details?id=com.epocheye"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="Get Epocheye on Google Play"
						className="pointer-events-auto inline-flex transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg">
						<Image
							src={googlePlayBadge}
							alt="Get it on Google Play"
							width={200}
							height={77}
							className="h-[64px] w-auto sm:h-[76px]"
						/>
					</a>
					{/* Pre-orders: vote with a ticket for the next site we build. */}
					<Link
						href="/preorder"
						className="group pointer-events-auto inline-flex items-center gap-3 whitespace-nowrap rounded-full border border-white/30 bg-white/[0.06] py-2.5 pl-3 pr-5 text-[13px] font-medium text-white backdrop-blur-md transition-colors duration-300 hover:border-[#CCFF00]/70 focus:outline-none focus:ring-2 focus:ring-white/50 sm:text-base">
						<span className="rounded-full bg-[#CCFF00] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black">New</span>
						{`Pre-order the next site · ${formatPrice(PREORDER_PRICE)}`}
						<span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
							→
						</span>
					</Link>
				</motion.div>
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
