import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextType from "../TextType";
import PixelCard from "../PixelCard";

gsap.registerPlugin(ScrollTrigger);

const Features = () => {
	const sectionRef = useRef(null);

	const features = [
		{
			emoji: "🏛️",
			title: "Multi-Era Time Travel",
			description:
				"Watch the Taj Mahal transform across 4 centuries. See Hampi's temples before they fell. Toggle between past and present with a swipe - powered by historical records and archaeological data.",
			position: { top: "5%", left: "5%" },
		},
		{
			emoji: "🎮",
			title: "Gamified Exploration",
			description:
				"Earn rewards as you discover hidden stories and complete heritage quests. Unlock rare historical footage, compete on leaderboards, and collect digital artifacts from each site you visit.",
			position: { top: "8%", right: "5%" },
		},
		{
			emoji: "📊",
			title: "Avoid The Crowds",
			description:
				"AI-powered crowd predictions tell you the best time to visit. Skip 2-hour queues at the Taj Mahal. Get real-time updates on wait times, ticket availability, and optimal viewing spots.",
			position: { bottom: "5%", left: "8%" },
		},
		{
			emoji: "🤖",
			title: "AI Tells Your Story",
			description:
				"No boring audio tours. Our AI narrator adapts stories to your interests - whether you're into architecture, royal intrigue, or ancient warfare. Every visit is personalized.",
			position: { bottom: "12%", right: "5%" },
		},

		{
			emoji: "🌐",
			title: "Indian Heritage, First",
			description:
				"Launching with 10 iconic UNESCO World Heritage Sites across India. 50+ global destinations coming by 2027 - from Machu Picchu to Angkor Wat.",
			position: { top: "20%", left: "35%" },
		},
	];

	// Optimized GSAP transition animation - removed heavy canvas animation
	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const ctx = gsap.context(() => {
			// Set initial state - fade in from bottom with scale
			gsap.set(section, {
				opacity: 0,
				y: 50,
			});

			// Animate in on scroll - simplified for better performance
			gsap.to(section, {
				opacity: 1,
				y: 0,
				duration: 0.8,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 85%",
					end: "top 50%",
					scrub: 0.5,
					markers: false,
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<div
			ref={sectionRef}
			className="relative bg-black w-full min-h-screen flex-1 px-4 sm:px-6 md:px-10 pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 md:pb-20 overflow-hidden">
			{/* Content Layer */}
			<div className="relative z-10 max-w-7xl mx-auto">
				<div className="relative z-20 mb-12 sm:mb-16 text-center">
					<h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white font-montserrat mb-4">
						Best Features
					</h2>
					<p className="text-white text-base sm:text-lg md:text-xl font-light font-montserrat px-4">
						Discover the cutting-edge features that make Epocheye your ultimate
						time travel companion.
					</p>
				</div>

				{/* Feature Cards */}
				<div className="relative w-full md:min-h-[1100px]" style={{ zIndex: 2 }}>
					{/* Text in the center between cards */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-3xl text-center px-4">
						<TextType
							text={[
								"Everything You Need for an Unforgettable Experience",
								"AR heritage tourism built for you",
								"Historical reconstruction AR, made simple",
							]}
							typingSpeed={75}
							pauseDuration={1500}
							showCursor={true}
							cursorCharacter="|"
							className="text-white text-base sm:text-xl md:text-3xl font-montserrat font-semibold"
							loop={true}
						/>
					</div>

					{features.map((feature, index) => (
						<div
							key={index}
							className="absolute hidden md:block z-20"
							style={{
								...feature.position,
								transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)`,
							}}>
							<PixelCard
								variant="blue"
								gap={6}
								speed={30}
								className="w-[300px] h-[420px]">
								<div className="absolute inset-0">
									<img
										src={`/${index + 1}.png`}
										alt={feature.title}
										loading="lazy"
										className="w-full h-full object-cover rounded-lg opacity-80"
									/>
									<div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent rounded-lg"></div>
									<div className="absolute inset-x-0 bottom-0 p-4 text-center">
										<h1 className="text-white my-2 text-lg font-semibold">
											{feature.title}
										</h1>
										<p className="text-white/80 text-sm leading-relaxed">
											{feature.description}
										</p>
									</div>
								</div>
							</PixelCard>
						</div>
					))}
				</div>

				{/* Mobile Feature Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden mb-8">
					{features.map((feature, index) => (
						<div key={index} className="flex justify-center">
							<PixelCard
								variant="blue"
								gap={6}
								speed={30}
								className="w-full max-w-[320px] h-[380px]">
								<div className="absolute inset-0">
									<img
										src={`/${index + 1}.png`}
										alt={feature.title}
										loading="lazy"
										className="w-full h-full object-cover rounded-lg opacity-80"
									/>
									<div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent rounded-lg"></div>
									<div className="absolute inset-x-0 bottom-0 p-4 text-center">
										<h1 className="text-white my-2 text-base sm:text-lg font-semibold">
											{feature.title}
										</h1>
										<p className="text-white/80 text-xs sm:text-sm leading-relaxed">
											{feature.description}
										</p>
									</div>
								</div>
							</PixelCard>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

export default Features;
