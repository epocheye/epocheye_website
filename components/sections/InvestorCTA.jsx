"use client";
import React from "react";
import { ArrowRight } from "lucide-react";

const InvestorCTA = () => {
	return (
		<section
			id="investor-cta"
			className="relative py-20 px-6 overflow-hidden"
			style={{ backgroundColor: "#0A0A0A" }}>
			<div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
				<p className="font-instrument-serif text-2xl sm:text-3xl text-white leading-tight">
					Investor or partner inquiry? We&apos;d love to connect.
				</p>
				<a
					href="mailto:sambit@epocheye.com"
					className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold tracking-wider uppercase text-white hover:bg-white hover:text-black transition-all duration-500 font-instrument-sans">
					Get in Touch
					<ArrowRight className="w-4 h-4" aria-hidden="true" />
				</a>
			</div>
		</section>
	);
};

export default InvestorCTA;
