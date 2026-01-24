"use client";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const locations = [
	{ name: "Colosseum", city: "Rome, Italy", x: 51, y: 35 },
	{ name: "Parthenon", city: "Athens, Greece", x: 54, y: 37 },
	{ name: "Machu Picchu", city: "Cusco, Peru", x: 23, y: 62 },
	{ name: "Angkor Wat", city: "Siem Reap, Cambodia", x: 76, y: 48 },
	{ name: "Petra", city: "Ma'an, Jordan", x: 56, y: 40 },
	{ name: "Pyramids", city: "Giza, Egypt", x: 53, y: 42 },
	{ name: "Great Wall", city: "Beijing, China", x: 78, y: 33 },
	{ name: "Taj Mahal", city: "Agra, India", x: 68, y: 42 },
];

const GlobalReach = () => {
	const sectionRef = useRef(null);
	const headerRef = useRef(null);
	const mapRef = useRef(null);
	const mapContainerRef = useRef(null);
	const [hoveredLocation, setHoveredLocation] = useState(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		const header = headerRef.current;
		const map = mapRef.current;
		const mapContainer = mapContainerRef.current;

		if (!section || !header || !map || !mapContainer) return;

		// Intersection Observer for animations
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isInView) {
						setIsInView(true);
					}
				});
			},
			{ threshold: 0.2 },
		);

		observer.observe(section);

		const ctx = gsap.context(() => {
			// Section fade-in with smooth entrance
			gsap.set(section, {
				opacity: 0,
			});

			gsap.to(section, {
				opacity: 1,
				duration: 1.2,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 85%",
					end: "top 50%",
					scrub: 0.8,
				},
			});

			// Header animation with smooth reveal
			const headerLines = header.querySelectorAll(".header-line");
			gsap.set(headerLines, {
				opacity: 0,
				y: 50,
				filter: "blur(10px)",
			});

			gsap.to(headerLines, {
				opacity: 1,
				y: 0,
				filter: "blur(0px)",
				duration: 1,
				stagger: 0.2,
				ease: "power3.out",
				scrollTrigger: {
					trigger: section,
					start: "top 70%",
					toggleActions: "play none none reverse",
				},
			});

			// Map container scale and fade animation
			gsap.set(mapContainer, {
				opacity: 0,
				scale: 0.9,
				y: 60,
			});

			gsap.to(mapContainer, {
				opacity: 1,
				scale: 1,
				y: 0,
				duration: 1.2,
				ease: "power2.out",
				scrollTrigger: {
					trigger: mapContainer,
					start: "top 80%",
					toggleActions: "play none none reverse",
				},
			});

			// Markers drop-in animation with enhanced stagger
			const markers = map.querySelectorAll(".map-marker");
			gsap.set(markers, {
				opacity: 0,
				scale: 0,
				y: -40,
			});

			gsap.to(markers, {
				opacity: 1,
				scale: 1,
				y: 0,
				duration: 0.8,
				stagger: 0.1,
				ease: "elastic.out(1, 0.5)",
				scrollTrigger: {
					trigger: map,
					start: "top 70%",
					toggleActions: "play none none reverse",
				},
			});

			// Connection lines animation
			const connections = map.querySelectorAll(".connection-line");
			gsap.set(connections, {
				strokeDashoffset: 1000,
				opacity: 0,
			});

			gsap.to(connections, {
				strokeDashoffset: 0,
				opacity: 0.3,
				duration: 2,
				stagger: 0.15,
				ease: "power2.inOut",
				scrollTrigger: {
					trigger: map,
					start: "top 65%",
					toggleActions: "play none none reverse",
				},
			});
		}, section);

		return () => {
			ctx.revert();
			observer.disconnect();
		};
	}, [isInView]);

	return (
		<section
			ref={sectionRef}
			id="global-reach"
			className="yz-section yz-section-dark flex flex-col items-center justify-start
				px-6 sm:px-10 lg:px-20 py-16 sm:py-20 lg:py-24"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Subtle gradient overlay for depth */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background:
						"radial-gradient(ellipse at 50% 30%, rgba(212, 175, 55, 0.03) 0%, transparent 60%)",
				}}
			/>

			{/* Section Header */}
			<div ref={headerRef} className="relative z-10 text-center mb-10 sm:mb-14 lg:mb-16">
				<h2
					className="header-line font-montserrat font-bold text-white
					text-4xl sm:text-6xl lg:text-7xl
					tracking-[4px] sm:tracking-[6px] lg:tracking-[8px]
					leading-[1.1]">
					Heritage
				</h2>

				<h2
					className="header-line font-montserrat font-bold uppercase text-white
					text-[32px] sm:text-[50px] lg:text-[70px]
					tracking-[4px] sm:tracking-[6px] lg:tracking-[8px]
					leading-[1.1]">
					Around The World
				</h2>
			</div>

			{/* World Map Container */}
			<div
				ref={mapContainerRef}
				className="relative w-full max-w-[1400px] aspect-[2.2/1] rounded-xl overflow-hidden"
				style={{
					backgroundColor: "#0A0A0A",
					boxShadow: "0 0 100px rgba(212, 175, 55, 0.05)",
				}}>
				{/* Decorative border glow */}
				<div
					className="absolute inset-0 rounded-xl pointer-events-none"
					style={{
						border: "1px solid rgba(212, 175, 55, 0.15)",
						boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.5)",
					}}
				/>

				{/* Real World Map SVG - Dotted Pattern Style */}
				<div ref={mapRef} className="relative w-full h-full">
					{/* Base dark background */}
					<div className="absolute inset-0 bg-[#0A0A0A]" />

					{/* World Map - Clean SVG with continents */}
					<svg
						viewBox="0 0 1000 500"
						className="absolute inset-0 w-full h-full"
						preserveAspectRatio="xMidYMid slice">
						{/* Grid lines for decorative effect */}
						<g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
							{[...Array(10)].map((_, i) => (
								<line
									key={`h-${i}`}
									x1="0"
									y1={i * 50}
									x2="1000"
									y2={i * 50}
								/>
							))}
							{[...Array(20)].map((_, i) => (
								<line
									key={`v-${i}`}
									x1={i * 50}
									y1="0"
									x2={i * 50}
									y2="500"
								/>
							))}
						</g>

						{/* Decorative latitude curves */}
						<g stroke="rgba(212, 175, 55, 0.08)" strokeWidth="0.5" fill="none">
							<ellipse cx="500" cy="250" rx="480" ry="200" />
							<ellipse cx="500" cy="250" rx="380" ry="150" />
							<ellipse cx="500" cy="250" rx="280" ry="100" />
							<line x1="20" y1="250" x2="980" y2="250" />
							<line x1="500" y1="30" x2="500" y2="470" />
						</g>

						{/* World Map Continents - Simple clean shapes */}
						<g fill="#1E1E1E" stroke="#2A2A2A" strokeWidth="1">
							{/* North America */}
							<path d="M80,100 Q120,60 180,55 Q240,50 280,70 Q310,90 320,130 Q315,170 290,200 Q260,230 220,250 Q180,265 140,260 Q100,250 75,220 Q55,185 55,150 Q55,120 80,100 Z" />
							{/* Greenland */}
							<path d="M340,50 Q380,40 410,55 Q430,75 420,100 Q400,115 365,110 Q335,100 330,75 Q325,55 340,50 Z" />
							{/* South America */}
							<path d="M200,280 Q240,270 270,290 Q300,320 305,370 Q300,420 275,455 Q245,480 210,470 Q180,450 175,410 Q170,360 180,310 Q190,285 200,280 Z" />
							{/* Europe */}
							<path d="M460,85 Q500,70 540,80 Q570,95 565,125 Q550,150 510,155 Q470,155 450,135 Q435,110 460,85 Z" />
							{/* UK */}
							<path d="M425,90 Q440,82 450,95 Q445,110 430,112 Q418,105 425,90 Z" />
							{/* Africa */}
							<path d="M460,165 Q500,155 540,170 Q575,200 590,250 Q595,310 575,360 Q545,400 500,410 Q455,405 430,365 Q415,320 420,270 Q430,210 460,165 Z" />
							{/* Russia */}
							<path d="M560,55 Q650,35 760,40 Q860,55 930,85 Q960,110 950,140 Q920,165 860,160 Q780,150 700,135 Q620,120 570,100 Q550,80 560,55 Z" />
							{/* Middle East */}
							<path d="M555,140 Q595,130 635,145 Q660,170 650,200 Q620,220 580,210 Q555,185 555,155 Q555,145 555,140 Z" />
							{/* India */}
							<path d="M650,190 Q690,180 720,205 Q740,245 725,290 Q695,320 660,310 Q635,285 640,240 Q645,205 650,190 Z" />
							{/* China */}
							<path d="M720,120 Q780,105 840,120 Q890,150 880,195 Q855,225 800,230 Q745,220 720,185 Q705,150 720,120 Z" />
							{/* Southeast Asia */}
							<path d="M745,250 Q790,240 830,260 Q860,295 845,335 Q810,360 765,350 Q735,320 740,280 Q742,260 745,250 Z" />
							{/* Japan */}
							<path d="M895,140 Q920,130 935,150 Q940,175 925,195 Q900,200 885,180 Q880,155 895,140 Z" />
							{/* Australia */}
							<path d="M800,365 Q860,350 920,375 Q960,415 950,460 Q915,490 860,490 Q805,480 780,445 Q770,405 800,365 Z" />
							{/* New Zealand */}
							<path d="M965,430 Q980,425 990,445 Q985,475 968,485 Q955,475 960,450 Q962,435 965,430 Z" />
						</g>
					</svg>

					{/* Location Markers */}
					{locations.map((location, index) => (
						<div
							key={index}
							className="map-marker absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-10"
							style={{ left: `${location.x}%`, top: `${location.y}%` }}
							onMouseEnter={() => setHoveredLocation(index)}
							onMouseLeave={() => setHoveredLocation(null)}>
							{/* Outer glow ring */}
							<div
								className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
								style={{
									background:
										"radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)",
								}}
							/>

							{/* Marker Pin */}
							<div
								className="relative w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 group-hover:scale-150 group-hover:shadow-lg"
								style={{
									backgroundColor: "#D4AF37",
									boxShadow: "0 0 10px rgba(212, 175, 55, 0.5)",
								}}
							/>

							{/* Pulse Animation */}
							<div
								className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-ping opacity-30"
								style={{ backgroundColor: "#D4AF37" }}
							/>

							{/* Tooltip */}
							{hoveredLocation === index && (
								<div
									className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-4 py-3 whitespace-nowrap z-30
										font-montserrat text-white backdrop-blur-sm
										text-[12px] sm:text-[14px]
										tracking-[1px] sm:tracking-[2px]
										rounded-lg transition-all duration-300"
									style={{
										backgroundColor: "rgba(26, 26, 26, 0.95)",
										border: "1px solid rgba(212, 175, 55, 0.5)",
										boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
									}}>
									<div className="font-semibold uppercase tracking-wider">
										{location.name}
									</div>
									<div className="text-[10px] sm:text-[11px] opacity-60 mt-1">
										{location.city}
									</div>
									<div
										className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
										style={{
											borderLeft: "8px solid transparent",
											borderRight: "8px solid transparent",
											borderTop:
												"8px solid rgba(212, 175, 55, 0.5)",
										}}
									/>
								</div>
							)}
						</div>
					))}
				</div>

				{/* Decorative corner accents */}
				<div
					className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 opacity-30"
					style={{ borderColor: "#D4AF37" }}
				/>
				<div
					className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 opacity-30"
					style={{ borderColor: "#D4AF37" }}
				/>
				<div
					className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 opacity-30"
					style={{ borderColor: "#D4AF37" }}
				/>
				<div
					className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 opacity-30"
					style={{ borderColor: "#D4AF37" }}
				/>
			</div>

			{/* Location Count */}
			<p
				className="relative z-10 mt-8 sm:mt-10 lg:mt-12 font-light text-center
					text-[14px] sm:text-[16px] lg:text-[18px]
					tracking-[2px]"
				style={{ color: "#B0B0B0" }}>
				8 MONUMENTS • 5 CONTINENTS • LAUNCHING 2026
			</p>
		</section>
	);
};

export default GlobalReach;
