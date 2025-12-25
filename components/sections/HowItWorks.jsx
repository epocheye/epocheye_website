"use client";
import React from "react";
import { Download, Camera, Play } from "lucide-react";

const steps = [
	{
		icon: Download,
		title: "Download & Choose Your Destination",
		description:
			"Pick from 10 UNESCO World Heritage Sites. Download the AR experience pack before you visit (or explore from home).",
	},
	{
		icon: Camera,
		title: "Point Your Camera",
		description:
			"Arrive at the site and open Epocheye. Point your phone at monuments, ruins, or landmarks to trigger AR overlays.",
	},
	{
		icon: Play,
		title: "Watch History Unfold",
		description:
			"See 3D reconstructions appear before your eyes. Listen to AI-narrated stories. Complete quests and earn rewards as you explore.",
	},
];

const HowItWorks = () => {
	return (
		<section
			id="how-it-works"
			className="relative w-full bg-black text-white py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-10 overflow-hidden">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-10 sm:mb-14 md:mb-16">
					<p className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3 font-semibold">
						How It Works
					</p>
					<h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold font-montserrat mb-4">
						History in Three Steps
					</h2>
					<p className="text-gray-300 max-w-3xl mx-auto text-base sm:text-lg font-light">
						The fastest way to experience AR heritage tourism. No manuals, no
						setup—just open the app and go.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
					{steps.map((step, idx) => (
						<div
							key={step.title}
							className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-7 flex flex-col gap-4 shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-white/20 transition-all">
							<div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/15">
								<step.icon className="w-6 h-6 text-white" />
							</div>
							<div className="flex items-start justify-between gap-2">
								<div>
									<h3 className="text-lg sm:text-xl font-semibold text-white font-montserrat">
										{step.title}
									</h3>
									<p className="text-gray-300 text-sm sm:text-base leading-relaxed">
										{step.description}
									</p>
								</div>
								<div className="text-gray-500 font-semibold text-sm">
									0{idx + 1}
								</div>
							</div>
						</div>
					))}
				</div>

				<div className="mt-10 sm:mt-12 text-center text-gray-300 text-sm sm:text-base">
					Works on any smartphone with AR capabilities (iOS 13+ or Android 10+)
				</div>
			</div>
		</section>
	);
};

export default HowItWorks;
