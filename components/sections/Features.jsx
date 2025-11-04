import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextType from "../TextType";
import PixelCard from "../PixelCard";
import LogoLoop from "../LogoLoop";

gsap.registerPlugin(ScrollTrigger);

const Features = () => {
	const sectionRef = useRef(null);

	const destinations = [
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Taj Mahal - Agra
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Red Fort - Delhi
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Qutub Minar - Delhi
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Humayun's Tomb - Delhi
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Ajanta Caves - Maharashtra
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Ellora Caves - Maharashtra
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Khajuraho Temples - Madhya Pradesh
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Hampi - Karnataka
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Fatehpur Sikri - Uttar Pradesh
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Konark Sun Temple - Odisha
				</span>
			),
		},
	];

	const features = [
		{
			emoji: "🏛️",
			title: "Multi-Era Time Travel",
			points: [
				"See monuments across centuries",
				"Compare ancient, medieval, and modern views",
				"Witness historical events in AR",
			],
			position: { top: "5%", left: "5%" },
		},
		{
			emoji: "🎮",
			title: "Gamified Exploration",
			points: [
				"Unlock hidden stories",
				"Earn badges and achievements",
				"Compete with friends on leaderboards",
			],
			position: { top: "8%", right: "5%" },
		},
		{
			emoji: "📊",
			title: "Crowd Predictions",
			points: [
				"Know when to visit (avoid crowds)",
				"Real-time capacity updates",
				"Optimal timing recommendations",
			],
			position: { bottom: "5%", left: "8%" },
		},
		{
			emoji: "🌐",
			title: "Global Coverage",
			points: [
				"10 destinations at launch",
				"50+ by end of Year 1",
				"UNESCO sites, palaces, forts, temples",
			],
			position: { bottom: "5%", right: "8%" },
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
						Best Features !!!
					</h2>
					<p className="text-white text-base sm:text-lg md:text-xl font-light font-montserrat px-4">
						Discover the cutting-edge features that make Epocheye your ultimate
						time travel companion.
					</p>
				</div>

				{/* Feature Cards */}
				<div className="relative w-full h-44 md:h-[1000px]" style={{ zIndex: 2 }}>
					{/* Text in the center between cards */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-3xl text-center px-4">
						<TextType
							text={[
								"Everything You Need for an Unforgettable Experience",
								"Turn your Phone into a Time Machine",
								"Capture. Relive. Share.",
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
								transform: `rotate(${index % 2 === 0 ? -3 : 3}deg)`,
							}}>
							<PixelCard
								variant="blue"
								gap={6}
								speed={30}
								className="w-[300px] h-[400px]">
								<div className="absolute inset-0 flex items-center justify-center flex-col">
									<img
										src={`/${index + 1}.png`}
										alt={feature.title}
										loading="lazy"
										className="w-full h-full object-cover rounded-lg"
									/>
									<h1 className="text-white my-2">{feature.title}</h1>
								</div>
							</PixelCard>
						</div>
					))}
				</div>

				{/* Mobile Feature Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:hidden mb-16">
					{features.map((feature, index) => (
						<div key={index} className="flex justify-center">
							<PixelCard
								variant="blue"
								gap={6}
								speed={30}
								className="w-full max-w-[300px] h-[350px]">
								<div className="absolute inset-0 flex items-center justify-center flex-col p-4">
									<img
										src={`/${index + 1}.png`}
										alt={feature.title}
										loading="lazy"
										className="w-full h-full object-cover rounded-lg"
									/>
									<h1 className="text-white my-2 text-sm sm:text-base">
										{feature.title}
									</h1>
								</div>
							</PixelCard>
						</div>
					))}
				</div>

				<div className="flex justify-center items-center px-4 flex-col h-96 md:gap-10">
					<h1 className="text-2xl sm:text-2xl md:text-5xl font-medium text-white font-montserrat text-center md:mt-20">
						Launch Destinations
					</h1>
					<div className="w-full py-5 md:py-10">
						<LogoLoop
							logos={destinations}
							speed={80}
							direction="left"
							logoHeight={40}
							gap={48}
							pauseOnHover={true}
							fadeOut={true}
							fadeOutColor="rgba(0, 0, 0, 1)"
							scaleOnHover={true}
							ariaLabel="Launch destinations"
						/>
					</div>
				</div>

				{/* Logo Loop with Destinations */}
			</div>
		</div>
	);
};

export default Features;
