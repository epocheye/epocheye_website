"use client";
import React from "react";
import { Camera, MessageSquare, WifiOff } from "lucide-react";
import { motion } from "motion/react";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

const features = [
	{
		Icon: Camera,
		title: "AR Time Travel",
		description:
			"Point your phone at any monument to see it at any point in its history — from original construction to present-day decay.",
	},
	{
		Icon: MessageSquare,
		title: "AI Historian",
		description:
			"Get expert commentary and immersive stories tailored to exactly where you're standing, in real time.",
	},
	{
		Icon: WifiOff,
		title: "Offline-First",
		description:
			"Full experience works without internet. Pre-download any heritage site before you visit.",
	},
];

const PowerStatement = () => {
	return (
		<section
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<DarkBeamsBackground
				opacity={0.24}
				scrimOpacity={0.54}
				beamProps={{ beamNumber: 9, speed: 0.58, rotation: -8 }}
			/>

			{/* Subtle dot grid */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.025]"
				style={{
					backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
					backgroundSize: "32px 32px",
				}}
			/>

			<div className="relative z-10 max-w-6xl mx-auto">
				{/* Label pill */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="flex justify-center mb-6">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/40 border border-white/10 rounded-full uppercase">
						Core Features
					</span>
				</motion.div>

				{/* Headline */}
				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.7, delay: 0.1 }}
					viewport={{ once: true }}
					className="text-center font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4">
					Everything you need to
					<br />
					<span className="font-semibold">experience history</span>
				</motion.h2>

				<motion.p
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.7, delay: 0.2 }}
					viewport={{ once: true }}
					className="text-center text-white/58 text-base sm:text-lg mb-16 sm:mb-20 font-light">
					Three capabilities that change the way you see the world.
				</motion.p>

				{/* Feature Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
					{features.map(({ Icon, title, description }, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 * i }}
							viewport={{ once: true }}
							className="bg-[#0d0d0d] border border-white/8 rounded-2xl p-8 flex flex-col gap-5 hover:border-white/15 transition-colors duration-300">
							<div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
								<Icon
									className="w-5 h-5 text-white/60"
									aria-hidden="true"
								/>
							</div>
							<div>
								<h3 className="font-montserrat font-semibold text-white text-lg mb-2">
									{title}
								</h3>
								<p className="text-white/58 text-sm leading-relaxed">
									{description}
								</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};

export default PowerStatement;
