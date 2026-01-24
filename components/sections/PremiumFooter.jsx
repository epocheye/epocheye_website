"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const PremiumFooter = () => {
	const footerRef = useRef(null);
	const contentRef = useRef(null);
	const logoRef = useRef(null);
	const linksRef = useRef(null);
	const ctaRef = useRef(null);
	const bottomRef = useRef(null);

	useEffect(() => {
		const footer = footerRef.current;
		const content = contentRef.current;
		const logo = logoRef.current;
		const links = linksRef.current;
		const cta = ctaRef.current;
		const bottom = bottomRef.current;

		if (!footer) return;

		const ctx = gsap.context(() => {
			// Logo reveal
			if (logo) {
				gsap.set(logo, { opacity: 0, y: 40, scale: 0.95 });
				gsap.to(logo, {
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 1,
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
					delay: 0.2,
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
					stagger: 0.1,
					delay: 0.4,
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
					delay: 0.6,
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
		{ label: "Twitter", href: "https://twitter.com", icon: "𝕏" },
		{ label: "Instagram", href: "https://instagram.com", icon: "◎" },
		{ label: "LinkedIn", href: "https://linkedin.com", icon: "in" },
	];

	return (
		<footer
			ref={footerRef}
			className="relative overflow-hidden"
			style={{ backgroundColor: "#0A0A0A" }}>
			{/* Subtle top gradient */}
			<div
				className="absolute top-0 left-0 right-0 h-px"
				style={{
					background:
						"linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.4) 50%, transparent 100%)",
				}}
			/>

			{/* Main Footer Content */}
			<div
				ref={contentRef}
				className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-20 py-20 sm:py-28 lg:py-32">
				{/* Logo & Main CTA Section */}
				<div className="text-center mb-16 sm:mb-20 lg:mb-24">
					{/* Logo */}
					<div ref={logoRef} className="mb-10 sm:mb-14">
						<h2
							className="font-montserrat font-bold uppercase 
								text-4xl sm:text-6xl lg:text-7xl
								tracking-[6px] sm:tracking-[10px] lg:tracking-[15px]"
							style={{ color: "#FFFFFF" }}>
							EPOCH<span style={{ color: "#D4AF37" }}>EYE</span>
						</h2>
						<p
							className="mt-4 sm:mt-6 font-light uppercase
								text-[12px] sm:text-[14px]
								tracking-[3px] sm:tracking-[5px]"
							style={{ color: "#666666" }}>
							See The Past. Live.
						</p>
					</div>

					{/* CTA */}
					<div ref={ctaRef}>
						<h3
							className="font-montserrat font-semibold uppercase mb-8 sm:mb-10
								text-xl sm:text-2xl lg:text-3xl
								tracking-[2px] sm:tracking-[4px]"
							style={{ color: "#FFFFFF" }}>
							Join The Vision
						</h3>

						<Link
							href="/signup"
							className="inline-flex items-center justify-center gap-3
								px-10 sm:px-14 py-4 sm:py-5
								font-montserrat font-semibold uppercase
								text-[13px] sm:text-[15px]
								tracking-[2px] sm:tracking-[3px]
								transition-all duration-500 group"
							style={{
								backgroundColor: "#D4AF37",
								color: "#0A0A0A",
								boxShadow: "0 0 40px rgba(212, 175, 55, 0.3)",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor = "#E8C547";
								e.currentTarget.style.boxShadow =
									"0 0 60px rgba(212, 175, 55, 0.5)";
								e.currentTarget.style.transform = "translateY(-2px)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor = "#D4AF37";
								e.currentTarget.style.boxShadow =
									"0 0 40px rgba(212, 175, 55, 0.3)";
								e.currentTarget.style.transform = "translateY(0)";
							}}>
							<span>Early Access</span>
							<span className="transform transition-transform duration-300 group-hover:translate-x-1">
								→
							</span>
						</Link>
					</div>
				</div>

				{/* Decorative divider */}
				<div
					className="max-w-[200px] mx-auto h-px mb-16 sm:mb-20"
					style={{
						background:
							"linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.3) 50%, transparent 100%)",
					}}
				/>

				{/* Navigation Links */}
				<div
					ref={linksRef}
					className="flex flex-wrap justify-center gap-8 sm:gap-12 lg:gap-16 mb-16 sm:mb-20">
					{footerLinks.map((link, index) => (
						<Link
							key={index}
							href={link.href}
							className="footer-link font-montserrat uppercase
								text-[12px] sm:text-[13px]
								tracking-[2px] sm:tracking-[3px]
								transition-all duration-300"
							style={{ color: "#888888" }}
							onMouseEnter={(e) => {
								e.currentTarget.style.color = "#D4AF37";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.color = "#888888";
							}}>
							{link.label}
						</Link>
					))}
				</div>

				{/* Social Links */}
				<div className="flex justify-center gap-6 sm:gap-8 mb-16 sm:mb-20">
					{socialLinks.map((social, index) => (
						<a
							key={index}
							href={social.href}
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link flex items-center justify-center 
								w-12 h-12 sm:w-14 sm:h-14
								rounded-full border transition-all duration-300
								font-montserrat text-sm sm:text-base"
							style={{
								borderColor: "rgba(255, 255, 255, 0.2)",
								color: "#888888",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.borderColor = "#D4AF37";
								e.currentTarget.style.color = "#D4AF37";
								e.currentTarget.style.transform = "translateY(-3px)";
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.borderColor =
									"rgba(255, 255, 255, 0.2)";
								e.currentTarget.style.color = "#888888";
								e.currentTarget.style.transform = "translateY(0)";
							}}
							aria-label={social.label}>
							{social.icon}
						</a>
					))}
				</div>
			</div>

			{/* Bottom Bar */}
			<div
				ref={bottomRef}
				className="border-t px-6 sm:px-10 lg:px-20 py-6 sm:py-8"
				style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
				<div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
					<p
						className="font-light text-[11px] sm:text-[12px] tracking-[1px]"
						style={{ color: "#555555" }}>
						© {new Date().getFullYear()} EpochEye. All rights reserved.
					</p>

					<div className="flex gap-6 sm:gap-8">
						<Link
							href="/privacy"
							className="font-light text-[11px] sm:text-[12px] tracking-[1px] transition-colors duration-300"
							style={{ color: "#555555" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = "#D4AF37")}
							onMouseLeave={(e) => (e.currentTarget.style.color = "#555555")}>
							Privacy
						</Link>
						<Link
							href="/terms"
							className="font-light text-[11px] sm:text-[12px] tracking-[1px] transition-colors duration-300"
							style={{ color: "#555555" }}
							onMouseEnter={(e) => (e.currentTarget.style.color = "#D4AF37")}
							onMouseLeave={(e) => (e.currentTarget.style.color = "#555555")}>
							Terms
						</Link>
					</div>
				</div>
			</div>

			{/* Decorative corner elements */}
			<div
				className="absolute bottom-20 left-10 w-20 h-20 opacity-10 pointer-events-none hidden lg:block"
				style={{
					borderLeft: "1px solid #D4AF37",
					borderBottom: "1px solid #D4AF37",
				}}
			/>
			<div
				className="absolute bottom-20 right-10 w-20 h-20 opacity-10 pointer-events-none hidden lg:block"
				style={{
					borderRight: "1px solid #D4AF37",
					borderBottom: "1px solid #D4AF37",
				}}
			/>
		</footer>
	);
};

export default PremiumFooter;
