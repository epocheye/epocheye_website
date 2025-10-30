"use client";
import React from "react";
import { Mail, Star, Zap, Trophy } from "lucide-react";

const Waitlist = () => {
	return (
		<div
			id="waitlist-section"
			className="relative w-full min-h-screen bg-white flex items-center justify-center overflow-hidden">
			{/* Decorative Elements */}

			{/* Main Content */}
			<div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-16 sm:py-20">
				{/* Hero Section */}
				<div className="text-center mb-16 sm:mb-20">
					{/* Main Heading */}
					<h1 className="font-montserrat text-xl md:text-4xl  font-semibold text-black mb-6 leading-tight px-4">
						Join the Waitlist &{" "}
						<span className="relative inline-block">
							<span className="relative z-10">Be Part of History</span>
							<svg
								className="absolute bottom-0 left-0 w-full h-3"
								viewBox="0 0 200 20"
								preserveAspectRatio="none">
								<path
									d="M0 15 Q50 25 100 15 T200 15 L200 20 L0 20 Z"
									fill="rgba(255, 235, 59, 0.5)"
								/>
							</svg>
						</span>
					</h1>
				</div>

				{/* Bottom CTA Section */}
				<div className="relative bg-black rounded-3xl p-10 sm:p-16 text-center overflow-hidden  mx-auto">
					{/* Animated gradient background */}
					<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 animate-gradient-x"></div>

					<div className="relative z-10">
						<h2 className="text-2xl md:text-4xl font-bold text-white mb-4 font-montserrat">
							Ready to Travel Through Time?
						</h2>
						<p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
							Launch date: December 31, 2025
						</p>
						<button
							data-tally-open="mZ4Aa0"
							data-tally-layout="modal"
							data-tally-width="600"
							data-tally-auto-close="1000"
							className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-2xl">
							<Mail className="w-5 h-5" />
							Join the Waitlist Now
						</button>
					</div>
				</div>
			</div>

			<style jsx>{`
				@keyframes float {
					0%,
					100% {
						transform: translateY(0px);
					}
					50% {
						transform: translateY(-20px);
					}
				}
				@keyframes float-delayed {
					0%,
					100% {
						transform: translateY(0px);
					}
					50% {
						transform: translateY(-30px);
					}
				}
				@keyframes gradient-x {
					0%,
					100% {
						background-position: 0% 50%;
					}
					50% {
						background-position: 100% 50%;
					}
				}
				.animate-float {
					animation: float 6s ease-in-out infinite;
				}
				.animate-float-delayed {
					animation: float-delayed 8s ease-in-out infinite;
				}
				.animate-gradient-x {
					background-size: 200% 200%;
					animation: gradient-x 15s ease infinite;
				}
			`}</style>
		</div>
	);
};

export default Waitlist;
