import React, { useEffect, useRef, useState } from "react";
import TextType from "../TextType";
import Galaxy from "../Galaxy";
import PixelCard from "../PixelCard";
import ScrollReveal from "../ScrollReveal";

const Features = () => {
	const canvasRef = useRef(null);
	const [nodePositions, setNodePositions] = useState([0, 0, 0, 0]);

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
		<div className="relative bg-black w-full min-h-screen flex-1 px-10 pt-20 pb-20 overflow-hidden">
			{/* Content Layer */}
			<div className="relative z-10 max-w-7xl mx-auto">
				<div className="relative z-20 mb-16 text-center">
					<h2 className="text-3xl md:text-5xl font-semibold text-white font-montserrat mb-4">
						Best Features !!!
					</h2>
					<p className="text-white text-lg md:text-xl font-light font-montserrat">
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
				<div className="relative w-full h-[1000px]" style={{ zIndex: 2 }}>
					{/* Text in the center between cards */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-3xl text-center">
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
							className="text-white text-xl md:text-3xl font-montserrat font-light"
							loop={true}
						/>
					</div>

					{features.map((feature, index) => (
						<div
							key={index}
							className="absolute"
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
			</div>
		</div>
	);
};

export default Features;
