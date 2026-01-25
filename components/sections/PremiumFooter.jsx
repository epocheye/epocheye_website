"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import Image from "next/image";

gsap.registerPlugin(ScrollTrigger);

const PremiumFooter = () => {
	const footerRef = useRef(null);
	const imageGridRef = useRef(null);
	const contentRef = useRef(null);
	const logoRef = useRef(null);
	const linksRef = useRef(null);
	const ctaRef = useRef(null);
	const bottomRef = useRef(null);

	// Heritage images for the grid
	const heritageImages = [
		{ src: "/img1.webp" },
		{ src: "/img2.webp" },
		{ src: "/img3.webp" },
		{ src: "/img4.webp" },
		{ src: "/img5.webp" },
		{ src: "/img6.webp" },
	];

	useEffect(() => {
		const footer = footerRef.current;
		const imageGrid = imageGridRef.current;
		const logo = logoRef.current;
		const links = linksRef.current;
		const cta = ctaRef.current;
		const bottom = bottomRef.current;

		if (!footer) return;

		const ctx = gsap.context(() => {
			// Image grid reveal with stagger
			if (imageGrid) {
				const images = imageGrid.querySelectorAll(".heritage-image");
				gsap.set(images, {
					opacity: 0,
					scale: 1.1,
					y: 30,
				});
				gsap.to(images, {
					opacity: 1,
					scale: 1,
					y: 0,
					duration: 1,
					stagger: 0.1,
					ease: "power3.out",
					scrollTrigger: {
						trigger: footer,
						start: "top 85%",
						toggleActions: "play none none reverse",
					},
				});
			}

			// Logo reveal
			if (logo) {
				gsap.set(logo, { opacity: 0, y: 40 });
				gsap.to(logo, {
					opacity: 1,
					y: 0,
					duration: 1,
					delay: 0.3,
					ease: "power3.out",
					scrollTrigger: {
						trigger: footer,
						start: "top 80%",
						toggleActions: "play none none reverse",
					},
				});
			}

			// CTA animation
			if (cta) {
				gsap.set(cta, { opacity: 0, y: 30 });
				gsap.to(cta, {
					opacity: 1,
					y: 0,
					duration: 0.8,
					delay: 0.5,
					ease: "power2.out",
					scrollTrigger: {
						trigger: footer,
						start: "top 80%",
						toggleActions: "play none none reverse",
					},
				});
			}

			// Links stagger animation
			if (links) {
				const linkItems = links.querySelectorAll(".footer-link");
				gsap.set(linkItems, { opacity: 0, y: 20 });
				gsap.to(linkItems, {
					opacity: 1,
					y: 0,
					duration: 0.6,
					stagger: 0.08,
					delay: 0.6,
					ease: "power2.out",
					scrollTrigger: {
						trigger: footer,
						start: "top 80%",
						toggleActions: "play none none reverse",
					},
				});
			}

			// Bottom bar fade
			if (bottom) {
				gsap.set(bottom, { opacity: 0 });
				gsap.to(bottom, {
					opacity: 1,
					duration: 0.8,
					delay: 0.8,
					ease: "power2.out",
					scrollTrigger: {
						trigger: footer,
						start: "top 80%",
						toggleActions: "play none none reverse",
					},
				});
			}
		}, footer);

		return () => ctx.revert();
	}, []);

	const footerLinks = [
		{ label: "About", href: "#about" },
		{ label: "Features", href: "#features" },
		{ label: "How It Works", href: "#how-it-works" },
		{ label: "FAQ", href: "#faq" },
	];

	const socialLinks = [
		{ label: "Twitter", href: "https://x.com/sambitsingha01", icon: "𝕏" },
		{ label: "Instagram", href: "https://instagram.com", icon: "◎" },
		{
			label: "LinkedIn",
			href: "https://www.linkedin.com/company/epocheye/",
			icon: "in",
		},
	];

	return (
		<footer
			ref={footerRef}
			className="relative overflow-hidden"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Heritage Image Grid - Top Section */}
			<div
				ref={imageGridRef}
				className="relative w-full h-[200px] sm:h-[280px] lg:h-[350px] overflow-hidden">
				{/* Image Grid */}
				<div className="absolute inset-0 grid grid-cols-6 gap-0">
					{heritageImages.map((image, index) => (
						<div
							key={index}
							className="heritage-image relative h-full overflow-hidden group"
							style={{
								borderRight:
									index < 5
										? "1px solid rgba(212, 175, 55, 0.15)"
										: "none",
							}}>
							<Image
								src={image.src}
								alt={image.alt}
								fill
								sizes="17vw"
								quality={70}
								className="object-cover transition-transform duration-700 group-hover:scale-110"
								style={{
									filter: "grayscale(40%) contrast(1.1)",
								}}
							/>
							{/* Subtle gold overlay on hover */}
							<div className="absolute inset-0 bg-[#D4AF37] opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
						</div>
					))}
				</div>

				{/* Gradient overlay from images to content */}
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background:
							"linear-gradient(to bottom, transparent 0%, transparent 40%, #0A0A0A 100%)",
					}}
				/>

				{/* Side vignettes */}
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background:
							"linear-gradient(to right, #0A0A0A 0%, transparent 15%, transparent 85%, #0A0A0A 100%)",
					}}
				/>
			</div>

			{/* Gold accent line */}
			<div
				className="relative h-px w-full"
				style={{
					background:
						"linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.5) 20%, rgba(212, 175, 55, 0.5) 80%, transparent 100%)",
				}}
			/>

			{/* Main Footer Content */}
			<div
				ref={contentRef}
				className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-20 py-16 sm:py-20 lg:py-24">
				{/* Logo & Tagline */}
				<div ref={logoRef} className="text-center mb-12 sm:mb-16">
					<h2
						className="font-montserrat font-bold uppercase 
							text-3xl sm:text-5xl lg:text-6xl
							tracking-[5px] sm:tracking-[8px] lg:tracking-[12px]"
						style={{ color: "#FFFFFF" }}>
						EPOCH<span style={{ color: "#D4AF37" }}>EYE</span>
					</h2>
					<p
						className="mt-3 sm:mt-4 font-light uppercase
							text-[11px] sm:text-[13px]
							tracking-[2px] sm:tracking-[4px]"
						style={{ color: "#666666" }}>
						See The Past. Live.
					</p>
				</div>

				{/* CTA Section */}
				<div ref={ctaRef} className="text-center mb-14 sm:mb-18">
					<h3
						className="font-montserrat font-medium uppercase mb-6 sm:mb-8
							text-lg sm:text-xl lg:text-2xl
							tracking-[2px] sm:tracking-[3px]"
						style={{ color: "#FFFFFF" }}>
						Join The Vision
					</h3>

					<button
						type="button"
						className="inline-flex items-center justify-center gap-3 px-8 sm:px-12 py-3.5 sm:py-4 font-montserrat font-semibold uppercase text-[12px] sm:text-[14px] tracking-[2px] sm:tracking-[3px] transition-all duration-500 group cursor-pointer"
						style={{
							backgroundColor: "#D4AF37",
							color: "#0A0A0A",
							boxShadow: "0 0 40px rgba(212, 175, 55, 0.25)",
						}}
						data-tally-open="mVR7OJ"
						data-tally-layout="modal"
						data-tally-width="600"
						data-tally-auto-close="1000"
						data-tally-transparent-background="1"
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = "#E8C547";
							e.currentTarget.style.boxShadow =
								"0 0 60px rgba(212, 175, 55, 0.4)";
							e.currentTarget.style.transform = "translateY(-2px)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = "#D4AF37";
							e.currentTarget.style.boxShadow =
								"0 0 40px rgba(212, 175, 55, 0.25)";
							e.currentTarget.style.transform = "translateY(0)";
						}}>
						<span>Get Early Access</span>
						<span className="transform transition-transform duration-300 group-hover:translate-x-1">
							→
						</span>
					</button>
				</div>

				{/* Decorative divider */}
				<div
					className="max-w-[120px] mx-auto h-px mb-12 sm:mb-14"
					style={{
						background:
							"linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.4) 50%, transparent 100%)",
					}}
				/>

				{/* Navigation & Social Links Row */}
				<div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-0">
					{/* Navigation Links - Left */}
					<div
						ref={linksRef}
						className="flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-10">
						{footerLinks.map((link, index) => (
							<Link
								key={index}
								href={link.href}
								className="footer-link font-montserrat uppercase
									text-[11px] sm:text-[12px]
									tracking-[2px] sm:tracking-[2.5px]
									transition-all duration-300 hover:tracking-[3px]"
								style={{ color: "#777777" }}
								onMouseEnter={(e) => {
									e.currentTarget.style.color = "#D4AF37";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.color = "#777777";
								}}>
								{link.label}
							</Link>
						))}
					</div>

					{/* Social Links - Right */}
					<div className="flex justify-center gap-5 sm:gap-6">
						{socialLinks.map((social, index) => (
							<a
								key={index}
								href={social.href}
								target="_blank"
								rel="noopener noreferrer"
								className="footer-link flex items-center justify-center 
									w-11 h-11 sm:w-12 sm:h-12
									rounded-full border transition-all duration-300
									font-montserrat text-sm"
								style={{
									borderColor: "rgba(255, 255, 255, 0.15)",
									color: "#777777",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = "#D4AF37";
									e.currentTarget.style.color = "#D4AF37";
									e.currentTarget.style.transform = "translateY(-3px)";
									e.currentTarget.style.boxShadow =
										"0 4px 20px rgba(212, 175, 55, 0.2)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor =
										"rgba(255, 255, 255, 0.15)";
									e.currentTarget.style.color = "#777777";
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.boxShadow = "none";
								}}
								aria-label={social.label}>
								{social.icon}
							</a>
						))}
					</div>
				</div>
			</div>

			{/* Bottom Bar */}
			<div
				ref={bottomRef}
				className="border-t px-6 sm:px-10 lg:px-20 py-5 sm:py-6"
				style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
				<div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
					<p
						className="font-light text-[10px] sm:text-[11px] tracking-[1px]"
						style={{ color: "#444444" }}>
						© {new Date().getFullYear()} EpochEye. All rights reserved.
					</p>

					<div className="flex gap-5 sm:gap-6">
						<Link
							href="/privacy"
							className="font-light text-[10px] sm:text-[11px] tracking-[1px] transition-colors duration-300"
							style={{ color: "#444444" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = "#D4AF37")}
							onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}>
							Privacy
						</Link>
						<Link
							href="/terms"
							className="font-light text-[10px] sm:text-[11px] tracking-[1px] transition-colors duration-300"
							style={{ color: "#444444" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = "#D4AF37")}
							onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}>
							Terms
						</Link>
					</div>
				</div>
			</div>

			{/* Subtle decorative corners */}
			<div
				className="absolute bottom-16 left-8 w-16 h-16 opacity-[0.08] pointer-events-none hidden lg:block"
				style={{
					borderLeft: "1px solid #D4AF37",
					borderBottom: "1px solid #D4AF37",
				}}
			/>
			<div
				className="absolute bottom-16 right-8 w-16 h-16 opacity-[0.08] pointer-events-none hidden lg:block"
				style={{
					borderRight: "1px solid #D4AF37",
					borderBottom: "1px solid #D4AF37",
				}}
			/>
		</footer>
	);
};

export default PremiumFooter;
