"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Twitter, Instagram, Linkedin } from "lucide-react";
import logoWhite from "../../public/logo-white.png";

const productLinks = [
	{ label: "Features", href: "#features" },
	{ label: "How It Works", href: "#how-it-works" },
	{ label: "Download", href: "#download" },
];

const companyLinks = [
	{ label: "About", href: "#about" },
	{ label: "Creators", href: "/creators" },
	{ label: "Blog", href: "#blog" },
];

const socialLinks = [
	{
		label: "Twitter / X",
		href: "https://x.com/sambitsingha01",
		Icon: Twitter,
	},
	{
		label: "Instagram",
		href: "https://instagram.com",
		Icon: Instagram,
	},
	{
		label: "LinkedIn",
		href: "https://www.linkedin.com/company/epocheye/",
		Icon: Linkedin,
	},
];

const PremiumFooter = () => {
	return (
		<footer className="relative overflow-hidden" style={{ backgroundColor: "#080808" }}>
			{/* CTA Strip */}
			<div className="px-6 sm:px-10 lg:px-20 py-20 sm:py-24 lg:py-32 text-center">
				<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-8">
					Ready to see the world
					<br />
					<span className="font-semibold">differently?</span>
				</h2>

				<button
					type="button"
					className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all duration-300 cursor-pointer"
					data-tally-open="mVR7OJ"
					data-tally-layout="modal"
					data-tally-width="600"
					data-tally-auto-close="1000"
					data-tally-transparent-background="1">
					Get Early Access
					<ArrowRight className="w-4 h-4" aria-hidden="true" />
				</button>
			</div>

			{/* Divider */}
			<div className="border-t border-white/8" />

			{/* Main Footer */}
			<div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-20 py-14 sm:py-16">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-10 lg:gap-12">
					{/* Col 1 — Brand */}
					<div className="col-span-2 sm:col-span-1">
						<Link href="/" aria-label="EpochEye Home" className="inline-block mb-4">
							<Image
								src={logoWhite}
								alt="EpochEye Logo"
								width={36}
								height={36}
							/>
						</Link>
						<p className="text-white/30 text-xs leading-relaxed font-light mb-1">
							See The Past. Live.
						</p>
						<p className="text-white/20 text-xs font-light">
							© {new Date().getFullYear()} EpochEye
						</p>
					</div>

					{/* Col 2 — Product */}
					<div>
						<h4 className="text-white/50 text-xs font-medium tracking-widest uppercase mb-5">
							Product
						</h4>
						<ul className="space-y-3">
							{productLinks.map(({ label, href }) => (
								<li key={label}>
									<Link
										href={href}
										className="text-white/40 text-sm hover:text-white transition-colors duration-200 font-light">
										{label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Col 3 — Company */}
					<div>
						<h4 className="text-white/50 text-xs font-medium tracking-widest uppercase mb-5">
							Company
						</h4>
						<ul className="space-y-3">
							{companyLinks.map(({ label, href }) => (
								<li key={label}>
									<Link
										href={href}
										className="text-white/40 text-sm hover:text-white transition-colors duration-200 font-light">
										{label}
									</Link>
								</li>
							))}
						</ul>
					</div>

					{/* Col 4 — Social */}
					<div>
						<h4 className="text-white/50 text-xs font-medium tracking-widest uppercase mb-5">
							Follow
						</h4>
						<ul className="space-y-3">
							{socialLinks.map(({ label, href, Icon }) => (
								<li key={label}>
									<a
										href={href}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-white/40 text-sm hover:text-white transition-colors duration-200 font-light">
										<Icon className="w-4 h-4" aria-hidden="true" />
										{label}
									</a>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>

			{/* Bottom bar */}
			<div className="border-t border-white/8 px-6 sm:px-10 lg:px-20 py-5">
				<div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
					<p className="text-white/20 text-xs font-light">
						All rights reserved.
					</p>
					<div className="flex gap-6">
						<Link
							href="/privacy"
							className="text-white/20 text-xs font-light hover:text-white/50 transition-colors duration-200">
							Privacy Policy
						</Link>
						<Link
							href="/terms"
							className="text-white/20 text-xs font-light hover:text-white/50 transition-colors duration-200">
							Terms of Service
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default PremiumFooter;
