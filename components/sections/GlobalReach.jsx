"use client";
import React, { useEffect, useRef, useState, memo } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ComposableMap, Geographies, Geography, Marker, Graticule } from "react-simple-maps";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

gsap.registerPlugin(ScrollTrigger);

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const locations = [
	{ name: "Pantheon", city: "Rome, Italy", coordinates: [12.4924, 41.8902] },
	{ name: "Parthenon", city: "Athens, Greece", coordinates: [23.7275, 37.9715] },
	{ name: "Machu Picchu", city: "Cusco, Peru", coordinates: [-72.545, -13.1631] },
	{ name: "Angkor Wat", city: "Siem Reap, Cambodia", coordinates: [103.867, 13.4125] },
	{ name: "Petra", city: "Ma'an, Jordan", coordinates: [35.4444, 30.3285] },
	{ name: "Pyramids", city: "Giza, Egypt", coordinates: [31.1342, 29.9792] },
	{ name: "Great Wall", city: "Beijing, China", coordinates: [116.5704, 40.4319] },
	{ name: "Taj Mahal", city: "Agra, India", coordinates: [78.0421, 27.1751] },
];

const MapChart = memo(({ hoveredLocation, setHoveredLocation }) => {
	return (
		<ComposableMap
			projection="geoMercator"
			projectionConfig={{
				scale: 140,
				center: [20, 25],
			}}
			style={{
				width: "100%",
				height: "100%",
			}}>
			{/* Graticule - Grid lines */}
			<Graticule stroke="rgba(212, 175, 55, 0.08)" strokeWidth={0.5} />

			{/* Countries */}
			<Geographies geography={geoUrl}>
				{({ geographies }) =>
					geographies.map((geo) => (
						<Geography
							key={geo.rsmKey}
							geography={geo}
							fill="#1A1A1A"
							stroke="#2A2A2A"
							strokeWidth={0.5}
							style={{
								default: {
									fill: "#1A1A1A",
									stroke: "#2A2A2A",
									strokeWidth: 0.5,
									outline: "none",
								},
								hover: {
									fill: "#252525",
									stroke: "#D4AF37",
									strokeWidth: 0.8,
									outline: "none",
									transition: "all 0.3s ease",
								},
								pressed: {
									fill: "#1A1A1A",
									outline: "none",
								},
							}}
						/>
					))
				}
			</Geographies>

			{/* Location Markers */}
			{locations.map((location, index) => (
				<Marker
					key={index}
					coordinates={location.coordinates}
					onMouseEnter={() => setHoveredLocation(index)}
					onMouseLeave={() => setHoveredLocation(null)}>
					{/* Outer glow */}
					<circle
						r={hoveredLocation === index ? 12 : 8}
						fill="rgba(212, 175, 55, 0.2)"
						className="transition-all duration-300"
					/>
					{/* Inner marker */}
					<circle
						r={hoveredLocation === index ? 6 : 4}
						fill="#D4AF37"
						stroke="#0A0A0A"
						strokeWidth={1}
						className="cursor-pointer transition-all duration-300"
						style={{
							filter: "drop-shadow(0 0 6px rgba(212, 175, 55, 0.6))",
						}}
					/>
					{/* Pulse animation ring */}
					<circle
						r={6}
						fill="none"
						stroke="#D4AF37"
						strokeWidth={1}
						opacity={0.4}
						className="animate-ping"
					/>
				</Marker>
			))}
		</ComposableMap>
	);
});

MapChart.displayName = "MapChart";

const GlobalReach = () => {
	const sectionRef = useRef(null);
	const headerRef = useRef(null);
	const mapContainerRef = useRef(null);
	const [hoveredLocation, setHoveredLocation] = useState(null);
	const [isMapMounted, setIsMapMounted] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		if (!section) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsMapMounted(true);
						observer.unobserve(section);
					}
				});
			},
			{ threshold: 0.1, rootMargin: "120px 0px" },
		);

		observer.observe(section);

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const section = sectionRef.current;
		const header = headerRef.current;
		const mapContainer = mapContainerRef.current;

		if (!section || !header || !mapContainer) return;

		const ctx = gsap.context(() => {
			// Section fade-in
			gsap.set(section, { opacity: 0 });
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

			// Header animation
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

			// Map container animation
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
		}, section);

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			id="global-reach"
			className="relative flex flex-col items-stretch justify-start px-6 sm:px-10 lg:px-20 py-24 sm:py-32 lg:py-40 max-w-7xl mx-auto"
			style={{ backgroundColor: "#0A0A0A" }}>
			<DarkBeamsBackground
				opacity={0.22}
				scrimOpacity={0.44}
				beamProps={{ beamNumber: 8, speed: 0.45, rotation: -6 }}
			/>

			{/* Section Header */}
			<div ref={headerRef} className="relative z-10 mb-10 sm:mb-14 lg:mb-16 max-w-3xl">
				<span className="header-line font-instrument-sans text-xs sm:text-sm font-semibold tracking-[0.3em] text-accent uppercase">
					{"// GLOBAL COVERAGE"}
				</span>
				<h2 className="header-line font-instrument-serif text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.05] mt-4">
					Heritage around the world.
				</h2>
			</div>

			{/* World Map Container */}
			<div
				ref={mapContainerRef}
				className="brutalist-card relative w-full aspect-square sm:aspect-[2/1] overflow-hidden"
				style={{ backgroundColor: "#0d0d0d" }}>
				{/* Inner shadow for depth */}
				<div
					className="absolute inset-0 pointer-events-none z-10"
					style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)" }}
				/>

				{/* Map */}
				<div className="absolute inset-0">
					{isMapMounted ? (
						<MapChart
							hoveredLocation={hoveredLocation}
							setHoveredLocation={setHoveredLocation}
						/>
					) : (
						<div className="w-full h-full" aria-hidden="true" />
					)}
				</div>

				{/* Floating Tooltip */}
				{isMapMounted && hoveredLocation !== null && (
					<div
						className="absolute z-20 px-4 py-3 pointer-events-none font-instrument-sans text-white backdrop-blur-sm text-[12px] sm:text-[14px] tracking-[1px] sm:tracking-[2px] rounded-lg transition-all duration-300 animate-fadeIn max-w-[80vw]"
						style={{
							left: "50%",
							top: "10%",
							transform: "translateX(-50%)",
							backgroundColor: "rgba(26, 26, 26, 0.95)",
							border: "1px solid rgba(212, 175, 55, 0.5)",
							boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
						}}>
						<div className="font-semibold uppercase tracking-wider text-center">
							{locations[hoveredLocation].name}
						</div>
						<div className="text-[10px] sm:text-[11px] opacity-60 mt-1 text-center">
							{locations[hoveredLocation].city}
						</div>
					</div>
				)}
			</div>

			{/* Location Count */}
			<p className="relative z-10 mt-10 sm:mt-12 font-instrument-sans text-xs sm:text-sm font-medium tracking-[0.25em] text-white/60 text-center uppercase">
				8 Monuments · 5 Continents · Launching 2026
			</p>
		</section>
	);
};

export default GlobalReach;
