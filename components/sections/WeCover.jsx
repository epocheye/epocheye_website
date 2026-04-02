"use client";
import React from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

const civilizations = [
	{ name: "Ancient Rome", region: "Rome, Italy" },
	{ name: "Greek Heritage", region: "Athens, Greece" },
	{ name: "Mayan Civilization", region: "Mesoamerica" },
	{ name: "Incan Heritage", region: "Peru, South America" },
	{ name: "Khmer Empire", region: "Cambodia, SE Asia" },
	{ name: "Egyptian Dynasties", region: "Giza, Egypt" },
	{ name: "Medieval Europe", region: "Europe" },
	{ name: "Asian Temples", region: "China · India · Japan" },
];

const WeCover = () => {
	return (
		<section
			id="we-cover"
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			{/* Dot grid */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.02]"
				style={{
					backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)`,
					backgroundSize: "40px 40px",
				}}
			/>

			<div className="relative z-10 max-w-6xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="text-center mb-16">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/40 border border-white/10 rounded-full uppercase mb-6">
						Coverage
					</span>
					<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4">
						<span className="font-semibold">8 World Heritage</span> Civilizations
					</h2>
					<p className="text-white/40 text-base sm:text-lg font-light">
						Launching 2026 — more added every quarter
					</p>
				</motion.div>

				{/* Civilization Grid */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-16">
					{civilizations.map((civ, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.05 * i }}
							viewport={{ once: true }}
							className="group bg-[#0d0d0d] border border-white/8 rounded-xl p-5 hover:border-white/20 transition-all duration-300 cursor-default">
							<div className="flex items-start justify-between gap-2">
								<div>
									<h3 className="font-montserrat font-semibold text-white text-sm sm:text-base leading-snug mb-1">
										{civ.name}
									</h3>
									<p className="text-white/30 text-xs leading-relaxed">{civ.region}</p>
								</div>
								<ArrowRight
									className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0 mt-0.5"
									aria-hidden="true"
								/>
							</div>
						</motion.div>
					))}
				</div>

				{/* Stat strip */}
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					viewport={{ once: true }}
					className="flex items-center justify-center gap-4 sm:gap-8">
					<div className="h-px flex-1 max-w-[120px] bg-white/8" />
					<p className="text-white/30 text-xs sm:text-sm tracking-widest uppercase font-light text-center">
						8 monuments&nbsp;&nbsp;·&nbsp;&nbsp;5 continents&nbsp;&nbsp;·&nbsp;&nbsp;launching 2026
					</p>
					<div className="h-px flex-1 max-w-[120px] bg-white/8" />
				</motion.div>
			</div>
		</section>
	);
};

export default WeCover;
