"use client";
import React from "react";
import { Camera, MessageSquare, WifiOff } from "lucide-react";
import { motion } from "motion/react";

const FEATURES = [
	{
		Icon: Camera,
		title: "AR Time Travel",
		description:
			"Point your phone at any monument to see it at any point in its history — from original construction to present-day decay.",
		eyebrow: "01 / SEE",
	},
	{
		Icon: MessageSquare,
		title: "AI Historian",
		description:
			"Get expert commentary and immersive stories tailored to exactly where you're standing, in real time.",
		eyebrow: "02 / LEARN",
	},
	{
		Icon: WifiOff,
		title: "Offline-First",
		description:
			"Full experience works without internet. Pre-download any heritage site before you visit.",
		eyebrow: "03 / GO",
	},
];

const WhatWeDo = () => {
	return (
		<section
			id="what-we-do"
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#0A0A0A" }}>
			<div className="relative z-10 max-w-6xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="mb-14 sm:mb-20 max-w-3xl">
					<span className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
						{"// WHAT WE DO"}
					</span>
					<h2 className="font-instrument-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
						Three capabilities. One unfair advantage.
					</h2>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-7 sm:gap-9">
					{FEATURES.map(({ Icon, title, description, eyebrow }, i) => (
						<motion.article
							key={title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.08 * i }}
							viewport={{ once: true }}
							className="brutalist-card bg-[#0d0d0d] p-7 sm:p-8 flex flex-col">
							<div className="flex items-center justify-between mb-8">
								<Icon
									className="w-7 h-7 text-accent"
									aria-hidden="true"
									strokeWidth={1.5}
								/>
								<span className="font-instrument-sans text-xs font-medium tracking-[0.25em] text-white/45 uppercase">
									{eyebrow}
								</span>
							</div>
							<h3 className="font-instrument-serif text-white text-2xl sm:text-3xl leading-tight mb-4">
								{title}
							</h3>
							<p className="text-white/70 text-base sm:text-lg leading-relaxed font-instrument-sans">
								{description}
							</p>
						</motion.article>
					))}
				</div>
			</div>
		</section>
	);
};

export default WhatWeDo;
