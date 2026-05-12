"use client";
import React from "react";
import { motion } from "motion/react";

const STATS = [
	{ value: "10K+", label: "Signups" },
	{ value: "50+", label: "Beta Users" },
	{ value: "3", label: "OTA Partners" },
	{ value: "STPI · AWS", label: "Backed By" },
];

const TractionWall = () => {
	return (
		<section
			id="traction-wall"
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<div className="relative z-10 max-w-6xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="mb-14 sm:mb-20">
					<span className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
						{"// THE NUMBERS"}
					</span>
					<h2 className="font-instrument-serif text-white text-3xl sm:text-4xl lg:text-5xl leading-[1.05] mt-4 max-w-3xl">
						By the numbers.
					</h2>
				</motion.div>

				<div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 sm:gap-y-16">
					{STATS.map((stat, i) => (
						<motion.div
							key={stat.label}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.05 * i }}
							viewport={{ once: true }}
							className="flex flex-col">
							<span
								className="font-instrument-serif text-white text-5xl sm:text-8xl leading-none "
								style={{ wordBreak: "break-word" }}>
								{stat.value}
							</span>
							<span
								className="block w-10 h-0.5 bg-accent mt-5"
								aria-hidden="true"
							/>
							<span className="font-instrument-sans text-xs sm:text-sm font-medium tracking-[0.25em] text-white/55 uppercase mt-4">
								{stat.label}
							</span>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
};

export default TractionWall;
