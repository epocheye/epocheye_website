import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TextType from "../TextType";
import PixelCard from "../PixelCard";
import LogoLoop from "../LogoLoop";

gsap.registerPlugin(ScrollTrigger);

const Features = () => {
	const sectionRef = useRef(null);
	const canvasRef = useRef(null);

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

	// Connecting particles animation
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		let animationId;
		let particles = [];

		const resizeCanvas = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};

		resizeCanvas();
		window.addEventListener("resize", resizeCanvas);

		// Responsive card positions based on screen size
		const getCardPositions = () => {
			const isMobile = window.innerWidth < 768;
			if (isMobile) {
				// Mobile: 2x2 grid positions
				return [
					{ x: 0.25, y: 0.2 }, // top-left
					{ x: 0.75, y: 0.2 }, // top-right
					{ x: 0.25, y: 0.8 }, // bottom-left
					{ x: 0.75, y: 0.8 }, // bottom-right
				];
			} else {
				// Desktop: spread out more
				return [
					{ x: 0.125, y: 0.15 }, // top-left
					{ x: 0.875, y: 0.18 }, // top-right
					{ x: 0.15, y: 0.85 }, // bottom-left
					{ x: 0.85, y: 0.85 }, // bottom-right
				];
			}
		};

		let cardPositions = getCardPositions();

		// Update card positions on resize
		const handleResize = () => {
			cardPositions = getCardPositions();
		};

		window.addEventListener("resize", handleResize);

		class Particle {
			constructor() {
				this.reset();
			}

			reset() {
				// Start from a random card
				this.currentCardIndex = Math.floor(Math.random() * cardPositions.length);
				this.nextCardIndex = (this.currentCardIndex + 1) % cardPositions.length;

				const start = cardPositions[this.currentCardIndex];
				this.x = start.x * canvas.width;
				this.y = start.y * canvas.height;

				this.progress = 0;
				this.speed = 0.002 + Math.random() * 0.003;
				this.size = 2 + Math.random() * 3;
				this.opacity = 0;
				this.hue = 200 + Math.random() * 60; // Blue-cyan range
			}

			update() {
				this.progress += this.speed;

				if (this.progress >= 1) {
					this.currentCardIndex = this.nextCardIndex;
					this.nextCardIndex = (this.currentCardIndex + 1) % cardPositions.length;
					this.progress = 0;
				}

				// Smooth interpolation between cards
				const start = cardPositions[this.currentCardIndex];
				const end = cardPositions[this.nextCardIndex];

				const easeProgress = this.easeInOutCubic(this.progress);
				this.x = (start.x + (end.x - start.x) * easeProgress) * canvas.width;
				this.y = (start.y + (end.y - start.y) * easeProgress) * canvas.height;

				// Fade in/out at start and end
				if (this.progress < 0.1) {
					this.opacity = this.progress / 0.1;
				} else if (this.progress > 0.9) {
					this.opacity = (1 - this.progress) / 0.1;
				} else {
					this.opacity = 1;
				}
			}

			easeInOutCubic(t) {
				return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
			}

			draw() {
				// Enhanced white glow with larger radius
				const glowRadius = this.size * 5; // Increased from 3 to 5 for more glow

				// Outer glow
				ctx.beginPath();
				ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
				const outerGradient = ctx.createRadialGradient(
					this.x,
					this.y,
					0,
					this.x,
					this.y,
					glowRadius
				);
				outerGradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.8})`);
				outerGradient.addColorStop(0.3, `rgba(255, 255, 255, ${this.opacity * 0.4})`);
				outerGradient.addColorStop(0.6, `rgba(255, 255, 255, ${this.opacity * 0.15})`);
				outerGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
				ctx.fillStyle = outerGradient;
				ctx.fill();

				// Inner bright core
				ctx.beginPath();
				ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
				const coreGradient = ctx.createRadialGradient(
					this.x,
					this.y,
					0,
					this.x,
					this.y,
					this.size
				);
				coreGradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
				coreGradient.addColorStop(0.7, `rgba(255, 255, 255, ${this.opacity * 0.8})`);
				coreGradient.addColorStop(1, `rgba(255, 255, 255, ${this.opacity * 0.3})`);
				ctx.fillStyle = coreGradient;
				ctx.fill();
			}
		}

		// Create particles
		const particleCount = window.innerWidth < 768 ? 6 : 12;
		for (let i = 0; i < particleCount; i++) {
			particles.push(new Particle());
			particles[i].progress = i / particleCount; // Stagger initial positions
		}

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw visible connecting lines between cards
			ctx.strokeStyle = "rgba(255, 255, 255, 0.25)"; // Much more visible white lines
			ctx.lineWidth = 1.5;
			ctx.setLineDash([8, 6]); // Dashed line for visual interest

			// Draw lines in a circuit: top-left → top-right → bottom-right → bottom-left → top-left
			ctx.beginPath();
			cardPositions.forEach((pos, index) => {
				const x = pos.x * canvas.width;
				const y = pos.y * canvas.height;
				if (index === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});
			// Close the loop back to first card
			ctx.lineTo(cardPositions[0].x * canvas.width, cardPositions[0].y * canvas.height);
			ctx.stroke();
			ctx.setLineDash([]); // Reset line dash

			// Use additive blending for glowing particles
			ctx.globalCompositeOperation = "lighter";

			particles.forEach((particle) => {
				particle.update();
				particle.draw();
			});

			// Reset composite operation
			ctx.globalCompositeOperation = "source-over";

			animationId = requestAnimationFrame(animate);
		};

		animate();

		return () => {
			window.removeEventListener("resize", resizeCanvas);
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(animationId);
		};
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
					{/* Canvas for connecting particles - visible on all screen sizes */}
					<canvas
						ref={canvasRef}
						className="absolute inset-0 w-full h-full pointer-events-none z-0"
						style={{ zIndex: 0 }}
					/>

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
