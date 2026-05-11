"use client";
import React from "react";
import { ArrowRight, User } from "lucide-react";
import { motion } from "motion/react";

const MEMBERS = [
	{
		name: "Sambit Singha",
		role: "Founder & CEO",
		bio: "Full-stack engineer and product builder. Previously worked at 2 startups. Built the Epocheye AR prototype from scratch.",
	},
];

const TeamAndInvestor = () => {
	return (
		<section
			id="team-investor"
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
						{"// THE TEAM"}
					</span>
					<h2 className="font-instrument-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
						Built by operators.
					</h2>
				</motion.div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-9 mb-20 sm:mb-28">
					{MEMBERS.map((m, i) => (
						<motion.article
							key={m.name}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.08 * i }}
							viewport={{ once: true }}
							className="brutalist-card bg-[#0d0d0d] p-7 sm:p-8 flex gap-6 items-start">
							<div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-white/15 bg-white/5 flex items-center justify-center">
								<User
									className="w-8 h-8 sm:w-10 sm:h-10 text-white/30"
									aria-hidden="true"
									strokeWidth={1.5}
								/>
							</div>
							<div className="flex-1 min-w-0">
								<h3 className="font-instrument-serif text-white text-xl sm:text-2xl leading-tight mb-1">
									{m.name}
								</h3>
								<p className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.25em] text-accent uppercase mb-4">
									{m.role}
								</p>
								<p className="text-white/70 text-base leading-relaxed font-instrument-sans">
									{m.bio}
								</p>
							</div>
						</motion.article>
					))}
				</div>

				<div className="flex items-center gap-6 mb-10">
					<div className="h-px flex-1 bg-accent/40" />
					<span className="font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
						{"// LET'S TALK"}
					</span>
					<div className="h-px flex-1 bg-accent/40" />
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="flex flex-col items-center text-center">
					<p className="font-instrument-serif text-white text-2xl sm:text-3xl lg:text-4xl leading-tight max-w-2xl">
						Investor or partner inquiry? We&apos;d love to connect.
					</p>
					<a
						href="mailto:sambit@epocheye.app"
						className="mt-8 inline-flex items-center gap-2 bg-accent text-black px-7 py-4 font-instrument-sans text-sm sm:text-base font-semibold tracking-[0.15em] uppercase hover:bg-white transition-colors duration-200">
						Get in Touch
						<ArrowRight className="w-5 h-5" aria-hidden="true" />
					</a>
				</motion.div>
			</div>
		</section>
	);
};

export default TeamAndInvestor;
