import React from "react";

const destinations = [
	// {
	// 	name: "Taj Mahal",
	// 	teaser: "See Mughal architecture in its golden age.",
	// },
	// {
	// 	name: "Red Fort",
	// 	location: "Delhi, Delhi NCR",
	// 	teaser: "Walk through the Mughal capital's seat of power.",
	// },
	// {
	// 	name: "Qutub Minar",
	// 	location: "Delhi, Delhi NCR",
	// 	teaser: "Watch the tower rise alongside 12th-century Delhi.",
	// },
	// {
	// 	name: "Humayun's Tomb",
	// 	location: "Delhi, Delhi NCR",
	// 	teaser: "Step into the blueprint of the Taj Mahal.",
	// },
	// {
	// 	name: "Ajanta Caves",
	// 	location: "Aurangabad, Maharashtra",
	// 	teaser: "Experience Buddhist frescoes as they were painted.",
	// },
	// {
	// 	name: "Ellora Caves",
	// 	location: "Aurangabad, Maharashtra",
	// 	teaser: "Traverse 34 rock-cut temples in their prime.",
	// },
	// {
	// 	name: "Khajuraho Temples",
	// 	location: "Chhatarpur, Madhya Pradesh",
	// 	teaser: "See Chandela artisans carve in real-time.",
	// },
	{
		name: "Hampi",
		location: "Vijayanagara, Karnataka",
		teaser: "Stand inside a bustling Vijayanagara bazaar.",
	},
	{
		name: "Fatehpur Sikri",
		location: "Agra, Uttar Pradesh",
		teaser: "Witness Akbar's red sandstone capital alive with courts.",
	},
	{
		name: "Konark Sun Temple",
		location: "Puri, Odisha",
		teaser: "Watch the chariot of the sun restored to full glory.",
	},
];

const LaunchDestinations = () => {
	return (
		<section
			id="launch-destinations"
			className="relative w-full bg-black text-white py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-10 overflow-hidden">
			<div className="max-w-6xl mx-auto">
				<div className="text-center mb-8 sm:mb-12">
					<h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold font-montserrat mb-4">
						Launch Destinations - March 2026
					</h2>
					<p className="text-gray-300 text-base sm:text-lg max-w-3xl mx-auto font-light">
						We're starting with India's most iconic heritage sites. Each location
						features multiple AR experiences, historical reconstructions, and
						AI-guided tours.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8 mb-10">
					{destinations.map((spot) => (
						<div
							key={spot.name}
							className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm transition-all hover:border-white/20 hover:from-white/15 hover:via-white/8">
							<span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 transition-all group-hover:ring-white/15" />
							<span className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

							<div className="relative">
								<div className="flex items-start justify-between gap-4 mb-4">
									<h3 className="text-lg sm:text-xl font-semibold font-montserrat leading-tight">
										{spot.name}
									</h3>
									<span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-300">
										UNESCO
									</span>
								</div>
								<div className="flex items-center gap-2 text-sm sm:text-base text-gray-300 mb-3">
									<span className="h-1.5 w-1.5 rounded-full bg-white/60" />
									<span>{spot.location}</span>
								</div>
								<p className="text-gray-200/90 text-sm leading-relaxed">
									{spot.teaser}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default LaunchDestinations;
