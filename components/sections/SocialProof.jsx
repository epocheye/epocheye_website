import React from "react";

const testimonials = [
	{
		quote: "Finally, history comes alive! This is what every heritage site needs.",
		name: "Priya M.",
		role: "Travel Blogger",
	},
	{
		quote: "Showed my kids the Taj Mahal through Epocheye's demo - they were mesmerized.",
		name: "Rajesh K.",
		role: "Parent & Tourist",
	},
	{
		quote: "As a history teacher, this is the tool I've been waiting for.",
		name: "Dr. Anjali S.",
		role: "Educator",
	},
];

const shareText = encodeURIComponent(
	"Excited for @EpocheyeApp - AR time travel for heritage sites launching March 2026! \ud83c\udfdb\ufe0f\u2728"
);

const SocialProof = () => {
	return (
		<section className="relative w-full bg-white text-black py-10 sm:py-14 md:py-16 px-4 sm:px-6 md:px-10 overflow-hidden">
			<div className="max-w-6xl mx-auto">
				<div className="bg-gray-50 border border-black/5 rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<h3 className="text-xl sm:text-2xl md:text-3xl font-semibold font-montserrat">
							What early insiders are saying
						</h3>
						<div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600 flex-wrap">
							<span className="font-semibold text-gray-800">
								Share Epocheye:
							</span>
							<a
								className="px-3 py-1 rounded-full bg-white border border-black/5 hover:border-black/15 transition-colors"
								href={`https://twitter.com/intent/tweet?text=${shareText}`}
								target="_blank"
								rel="noopener noreferrer">
								Twitter
							</a>
							<a
								className="px-3 py-1 rounded-full bg-white border border-black/5 hover:border-black/15 transition-colors"
								href={`https://www.facebook.com/sharer/sharer.php?u=https://www.epocheye.app&quote=${shareText}`}
								target="_blank"
								rel="noopener noreferrer">
								Facebook
							</a>
							<a
								className="px-3 py-1 rounded-full bg-white border border-black/5 hover:border-black/15 transition-colors"
								href={`https://www.linkedin.com/sharing/share-offsite/?url=https://www.epocheye.app&summary=${shareText}`}
								target="_blank"
								rel="noopener noreferrer">
								LinkedIn
							</a>
							<a
								className="px-3 py-1 rounded-full bg-white border border-black/5 hover:border-black/15 transition-colors"
								href={`https://api.whatsapp.com/send?text=${shareText}`}
								target="_blank"
								rel="noopener noreferrer">
								WhatsApp
							</a>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
						{testimonials.map((item, index) => (
							<div
								key={index}
								className="bg-white border border-black/5 rounded-2xl p-5 shadow-[0_12px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-shadow duration-300 flex flex-col gap-3">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
										{item.name.charAt(0)}
									</div>
									<div>
										<p className="text-sm font-semibold text-gray-900">
											{item.name}
										</p>
										<p className="text-xs text-gray-500">
											{item.role}
										</p>
									</div>
								</div>
								<p className="text-base sm:text-lg text-gray-900 leading-relaxed font-light">
									"{item.quote}"
								</p>
							</div>
						))}
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-black/5 pt-4">
						<span className="text-sm sm:text-base text-gray-700 font-medium">
							Featured in:
						</span>
						<div className="flex flex-wrap items-center gap-3 sm:gap-4">
							{[
								"Media One",
								"Culture Weekly",
								"Travel Pulse",
								"Heritage Times",
							].map((label, idx) => (
								<div
									key={label}
									className="h-10 px-4 flex items-center justify-center rounded-lg bg-white text-gray-500 uppercase tracking-wide text-xs font-semibold border border-black/5 shadow-sm"
									aria-label={`Placeholder logo ${idx + 1}`}>
									{label}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default SocialProof;
