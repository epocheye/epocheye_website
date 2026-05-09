"use client";
import React from "react";
import { User } from "lucide-react";

const members = [
	{
		name: "Sambit Singha",
		role: "Founder & CEO",
		bio: "Full-stack engineer and product builder. Previously worked at 2 startups. Built the Epocheye AR prototype from scratch.",
	},
	{
		name: "Ankur Agarwal",
		role: "Mentor",
		bio: "Ex-BCG, Unilever, ClearTax. Operator with B2B SaaS and partnerships experience.",
	},
];

const Team = () => {
	return (
		<section
			id="team"
			className="relative py-24 sm:py-32 px-6 sm:px-10 lg:px-20 overflow-hidden"
			style={{ backgroundColor: "#080808" }}>
			<div className="relative z-10 max-w-5xl mx-auto">
				<div className="text-center mb-16">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/60 border border-white/20 rounded-full uppercase mb-6 font-instrument-sans">
						Who We Are
					</span>
					<h2 className="font-instrument-serif font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
						The Team
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					{members.map((m) => (
						<article
							key={m.name}
							className="bg-black/45 border border-white/12 rounded-2xl p-6 sm:p-7 backdrop-blur-[2px] hover:border-white/30 transition-all duration-300 flex flex-col items-center text-center">
							<div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-5">
								<User
									className="w-10 h-10 text-white/30"
									aria-hidden="true"
								/>
							</div>
							<h3 className="font-instrument-serif font-semibold text-white text-lg leading-tight mb-1">
								{m.name}
							</h3>
							<p className="text-white/55 text-xs tracking-widest uppercase mb-4 font-instrument-sans">
								{m.role}
							</p>
							<p className="text-white/65 text-sm leading-relaxed font-instrument-sans">
								{m.bio}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
};

export default Team;
