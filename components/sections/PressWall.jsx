"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

const NEWS = [
	{
		title: "Creators Program Applications Are Open",
		description:
			"History and travel creators can now join the partner program, get a referral code, and start tracking live performance.",
		href: "https://creators.epocheye.com",
		linkLabel: "Apply as a Creator",
		image: "/img9.webp",
		alt: "Creator filming a heritage monument",
	},
	{
		title: "Live Dashboard + Payout Tracking Enabled",
		description:
			"Early creators are now viewing clicks, conversions, and payout requests from one focused dashboard.",
		href: "https://creators.epocheye.com",
		linkLabel: "Creator Login",
		image: "/img10.webp",
		alt: "Ancient architecture featured in creator content",
	},
];

const PressWall = () => {
	return (
		<section
			id="press-wall"
			className="relative py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<div className="relative z-10 max-w-6xl mx-auto">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="mb-14 sm:mb-20 max-w-3xl">
					<span className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
						{"// PRESS & PARTNERSHIPS"}
					</span>
					<h2 className="font-instrument-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
						The latest from the field.
					</h2>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-9 mb-16">
					{NEWS.map((item, i) => (
						<motion.article
							key={item.title}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.08 * i }}
							viewport={{ once: true }}
							className="brutalist-card bg-[#0d0d0d] overflow-hidden flex flex-col">
							<div className="relative h-44 sm:h-52 w-full overflow-hidden">
								<Image
									src={item.image}
									alt={item.alt}
									fill
									sizes="(max-width: 768px) 100vw, 50vw"
									className="object-cover"
								/>
								<div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
							</div>
							<div className="p-7 sm:p-8 flex flex-col flex-1">
								<span className="font-instrument-sans text-xs font-semibold tracking-[0.25em] text-accent uppercase mb-3">
									Creators Program News
								</span>
								<h3 className="font-instrument-serif text-white text-2xl sm:text-3xl leading-tight mb-4">
									{item.title}
								</h3>
								<p className="text-white/70 text-base sm:text-lg leading-relaxed font-instrument-sans flex-1 mb-6">
									{item.description}
								</p>
								<Link
									href={item.href}
									className="inline-flex w-fit items-center font-instrument-sans text-sm sm:text-base font-semibold tracking-[0.15em] uppercase border border-accent text-accent px-5 py-3 hover:bg-accent hover:text-black transition-colors duration-200">
									{item.linkLabel}
								</Link>
							</div>
						</motion.article>
					))}
				</div>

				<div className="flex items-center justify-center gap-4 sm:gap-8">
					<div className="h-px flex-1 max-w-20 bg-white/15" />
					<p className="font-instrument-sans text-xs sm:text-sm font-medium tracking-[0.25em] uppercase text-white/55 text-center">
						Verified by historians · 100% accurate sources · Expert-curated content
					</p>
					<div className="h-px flex-1 max-w-20 bg-white/15" />
				</div>
			</div>
		</section>
	);
};

export default PressWall;
