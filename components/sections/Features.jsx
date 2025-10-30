import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextType from "../TextType";
import PixelCard from "../PixelCard";
import LogoLoop from "../LogoLoop";

gsap.registerPlugin(ScrollTrigger);

const Features = () => {
	const canvasRef = useRef(null);
	const sectionRef = useRef(null);
	const [nodePositions, setNodePositions] = useState([0, 0, 0, 0]);

	const destinations = [
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Taj Mahal - Agra, India
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Colosseum - Rome, Italy
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Machu Picchu - Cusco, Peru
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Pyramids of Giza - Cairo, Egypt
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Parthenon - Athens, Greece
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Great Wall - Beijing, China
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Petra - Jordan
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Notre-Dame - Paris, France
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Stonehenge - UK
				</span>
			),
		},
		{
			node: (
				<span className="text-white text-lg md:text-2xl font-montserrat">
					Chichen Itza - Mexico
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

	// Animate light nodes along the wires
	useEffect(() => {
		let animationFrame;
		let progress = 0;

		const animate = () => {
			progress += 0.005;
			if (progress > 1) progress = 0;

			setNodePositions([
				progress,
				(progress + 0.25) % 1,
				(progress + 0.5) % 1,
				(progress + 0.75) % 1,
			]);

			animationFrame = requestAnimationFrame(animate);
		};

		animate();

		return () => cancelAnimationFrame(animationFrame);
	}, []);

	// GSAP transition animation
	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const ctx = gsap.context(() => {
			// Set initial state - fade in from bottom with scale
			gsap.set(section, {
				opacity: 0,
				scale: 0.9,
				y: 100,
			});

			// Animate in on scroll
			gsap.to(section, {
				opacity: 1,
				scale: 1,
				y: 0,
				duration: 1.2,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 85%",
					end: "top 30%",
					scrub: 1,
					markers: false,
				},
			});
		}, section);

		return () => ctx.revert();
	}, []);

	// Draw connecting wires
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		const rect = canvas.getBoundingClientRect();

		canvas.width = rect.width;
		canvas.height = rect.height;

		const drawWires = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Define card center positions (approximate)
			const cards = [
				{ x: canvas.width * 0.15, y: canvas.height * 0.2 },
				{ x: canvas.width * 0.82, y: canvas.height * 0.23 },
				{ x: canvas.width * 0.18, y: canvas.height * 0.8 },
				{ x: canvas.width * 0.8, y: canvas.height * 0.8 },
			];

			// Draw connections in a loop
			const connections = [
				[0, 1],
				[1, 3],
				[3, 2],
				[2, 0],
			];

			connections.forEach(([from, to], index) => {
				const start = cards[from];
				const end = cards[to];

				// Draw wire (curved line)
				ctx.beginPath();
				ctx.strokeStyle = "rgba(255,255,255,0.1)";
				ctx.lineWidth = 2;

				const controlX = (start.x + end.x) / 2;
				const controlY = (start.y + end.y) / 2 - 50;

				ctx.moveTo(start.x, start.y);
				ctx.quadraticCurveTo(controlX, controlY, end.x, end.y);
				ctx.stroke();

				// Draw animated light node - small diamond shape
				const t = nodePositions[index];
				const nodeX =
					(1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * controlX + t * t * end.x;
				const nodeY =
					(1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * controlY + t * t * end.y;

				// Small dim glow
				const gradient = ctx.createRadialGradient(nodeX, nodeY, 0, nodeX, nodeY, 8);
				gradient.addColorStop(0, "rgba(255,255,255,0.2)");
				gradient.addColorStop(0.5, "rgba(255,255,255,0.2)");

				ctx.beginPath();
				ctx.fillStyle = gradient;
				ctx.arc(nodeX, nodeY, 8, 0, Math.PI * 2);
				ctx.fill();

				// Diamond-shaped light node
				ctx.save();
				ctx.translate(nodeX, nodeY);
				ctx.rotate(Math.PI / 4);
				ctx.fillStyle = "rgba(150, 180, 255, 0.6)";
				ctx.fillRect(-2, -2, 4, 4);
				ctx.restore();
			});
		};

		drawWires();

		const resizeHandler = () => {
			const rect = canvas.getBoundingClientRect();
			canvas.width = rect.width;
			canvas.height = rect.height;
			drawWires();
		};

		window.addEventListener("resize", resizeHandler);

		return () => window.removeEventListener("resize", resizeHandler);
	}, [nodePositions]);

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
				{/* Canvas for connecting wires */}
				<canvas
					ref={canvasRef}
					className="absolute inset-0 w-full h-full pointer-events-none"
					style={{ zIndex: -1 }}
				/>

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
							className="absolute hidden md:block"
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

				<div className="flex justify-center items-center px-4 flex-col h-96">
					<h1 className="text-xl sm:text-2xl md:text-5xl font-medium text-white font-montserrat text-center">
						Launch Destinations
					</h1>
					<div className="w-full py-5">
						<LogoLoop
							logos={destinations}
							speed={100}
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
