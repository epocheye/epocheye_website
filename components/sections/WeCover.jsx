"use client";
import React from "react";
import { motion } from "motion/react";
import Image from "next/image";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

const civilizations = [
	{
		name: "Ancient Rome",
		region: "Rome, Italy",
		monument: "Colosseum",
		image: "/img13.webp",
		alt: "Ancient Roman ruins at sunset",
	},
	{
		name: "Greek Heritage",
		region: "Athens, Greece",
		monument: "Parthenon",
		image: "/img14.webp",
		alt: "Ancient Greek temple columns",
	},
	{
		name: "Mayan Civilization",
		region: "Mesoamerica",
		monument: "Chichen Itza",
		image: "/img10.webp",
		alt: "Mayan pyramid under dramatic sky",
	},
	{
		name: "Incan Heritage",
		region: "Cusco, Peru",
		monument: "Machu Picchu",
		image: "/img12.webp",
		alt: "Machu Picchu mountain citadel",
	},
	{
		name: "Khmer Empire",
		region: "Siem Reap, Cambodia",
		monument: "Angkor Wat",
		image: "/img7.webp",
		alt: "Angkor temple stones and carvings",
	},
	{
		name: "Egyptian Dynasties",
		region: "Giza, Egypt",
		monument: "Great Pyramids",
		image: "/img12.webp",
		alt: "Pyramids in warm desert light",
	},
	{
		name: "Medieval Europe",
		region: "Europe",
		monument: "Fortress Cities",
		image: "/img8.webp",
		alt: "Medieval stone fortress on a hill",
	},
	{
		name: "Asian Temples",
		region: "China · India · Japan",
		monument: "Sacred Complexes",
		image: "/img2.webp",
		alt: "Ancient temple architecture in Asia",
	},
];

const WeCover = () => {
	return (
		<section
			id="we-cover"
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<DarkBeamsBackground
				opacity={0.24}
				scrimOpacity={0.56}
				beamProps={{ beamNumber: 9, speed: 0.55, rotation: -16 }}
			/>

			{/* Dot grid */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.03]"
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
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/60 border border-white/20 rounded-full uppercase mb-6">
						Coverage
					</span>
					<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4">
						<span className="font-semibold">8 World Heritage</span> Civilizations
					</h2>
					<p className="text-white/60 text-base sm:text-lg font-light">
						Launching 2026 — more added every quarter
					</p>
				</motion.div>

				{/* Civilization Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-16">
					{civilizations.map((civ, i) => (
						<motion.article
							key={i}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.05 * i }}
							viewport={{ once: true }}
							className="group bg-black/45 border border-white/12 rounded-2xl p-3 sm:p-3.5 backdrop-blur-[2px] hover:border-white/30 transition-all duration-300">
							<div className="relative aspect-4/5 w-full overflow-hidden rounded-xl mb-4">
								<Image
									src={civ.image}
									alt={civ.alt}
									fill
									sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
									className="object-cover transition-transform duration-700 group-hover:scale-105"
								/>
								<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-black/35" />
								<span className="absolute top-3 left-3 px-2 py-1 rounded-full border border-white/30 bg-black/55 text-[10px] font-semibold tracking-[0.18em] text-white/90">
									{String(i + 1).padStart(2, "0")}
								</span>
							</div>
							<h3 className="font-montserrat font-semibold text-white text-base leading-snug mb-1">
								{civ.name}
							</h3>
							<p className="text-white/65 text-sm leading-relaxed">
								{civ.region}
							</p>
							<p className="text-white/45 text-xs leading-relaxed mt-0.5">
								{civ.monument}
							</p>
						</motion.article>
					))}
				</div>

				{/* Stat strip */}
				<motion.div
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					viewport={{ once: true }}
					className="flex items-center justify-center gap-4 sm:gap-8">
					<div className="h-px flex-1 max-w-[120px] bg-white/15" />
					<p className="text-white/55 text-xs sm:text-sm tracking-widest uppercase font-light text-center">
						8 monuments&nbsp;&nbsp;·&nbsp;&nbsp;5
						continents&nbsp;&nbsp;·&nbsp;&nbsp;launching 2026
					</p>
					<div className="h-px flex-1 max-w-[120px] bg-white/15" />
				</motion.div>
			</div>
		</section>
	);
};

export default WeCover;
