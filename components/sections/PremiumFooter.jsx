"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Twitter, Instagram, Linkedin } from "lucide-react";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";
import logoWhite from "../../public/logo-white.png";

const productLinks = [
	{ label: "Features", href: "/features" },
	{ label: "How It Works", href: "/how-it-works" },
	{ label: "Download", href: "/download" },
];

const companyLinks = [
	{ label: "About", href: "/about" },
	{ label: "Creators", href: "https://creators.epocheye.com" },
	{ label: "Blog", href: "/blog" },
	{ label: "Investors", href: "/investors" },
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

const creatorsUpdates = [
	"Applications for the Creators Program are now open globally.",
	"Live creator dashboard now tracks clicks, conversions, and payouts.",
];

const PremiumFooter = () => {
	return (
		<footer className="relative overflow-hidden" style={{ backgroundColor: "#080808" }}>
			<DarkBeamsBackground
				opacity={0.22}
				scrimOpacity={0.58}
				beamProps={{ beamHeight: 20, beamNumber: 11, speed: 0.5, rotation: -10 }}
			/>

			<div className="relative z-10">
				{/* CTA Strip */}
				<div className="px-6 sm:px-10 lg:px-20 pt-20 pb-14 sm:pt-24 sm:pb-16 lg:pt-32 lg:pb-20 text-center">
					<h2 className="font-instrument-serif font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-8">
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

					<div className="max-w-5xl mx-auto mt-14 rounded-3xl overflow-hidden border border-white/15 bg-black/45 backdrop-blur-sm text-left">
						<div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-0">
							<div className="p-7 sm:p-8 lg:p-10">
								<p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/55 mb-3">
									Creators Program News
								</p>
								<h3 className="font-instrument-serif font-semibold text-white text-2xl sm:text-3xl leading-tight mb-4">
									The creator partner program is now live.
								</h3>
								<p className="text-white/62 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
									Apply for your creator code, publish to your audience,
									and track clicks, conversions, and payout requests in
									one dashboard.
								</p>
								<Link
									href="https://creators.epocheye.com"
									className="inline-flex items-center rounded-full border border-white/35 px-5 py-2.5 text-[11px] font-semibold tracking-[0.16em] uppercase text-white transition-colors duration-300 hover:bg-white hover:text-black">
									Apply as Creator
								</Link>
								<ul className="mt-6 space-y-2">
									{creatorsUpdates.map((update) => (
										<li
											key={update}
											className="text-white/55 text-sm leading-relaxed">
											{update}
										</li>
									))}
								</ul>
							</div>

							<div className="relative min-h-[220px] lg:min-h-full">
								<Image
									src="/img12.webp"
									alt="Creator-focused heritage scene"
									fill
									sizes="(max-width: 1024px) 100vw, 40vw"
									className="object-cover"
								/>
								<div className="absolute inset-0 bg-linear-to-t lg:bg-linear-to-r from-black/75 via-black/25 to-black/10" />
							</div>
						</div>
					</div>
				</div>

				{/* Divider */}
				<div className="border-t border-white/12" />

				{/* Main Footer */}
				<div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-20 py-14 sm:py-16">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-10 lg:gap-12">
						{/* Col 1 — Brand */}
						<div className="col-span-2 sm:col-span-1">
							<Link
								href="/"
								aria-label="EpochEye Home"
								className="inline-block mb-4">
								<Image
									src={logoWhite}
									alt="EpochEye Logo"
									width={36}
									height={36}
								/>
							</Link>
							<p className="text-white/45 text-xs leading-relaxed font-light mb-1">
								See The Past. Live.
							</p>
							<p className="text-white/30 text-xs font-light">
								© {new Date().getFullYear()} EpochEye
							</p>
						</div>

						{/* Col 2 — Product */}
						<div>
							<h4 className="text-white/65 text-xs font-medium tracking-widest uppercase mb-5">
								Product
							</h4>
							<ul className="space-y-3">
								{productLinks.map(({ label, href }) => (
									<li key={label}>
										<Link
											href={href}
											className="text-white/55 text-sm hover:text-white transition-colors duration-200 font-light">
											{label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Col 3 — Company */}
						<div>
							<h4 className="text-white/65 text-xs font-medium tracking-widest uppercase mb-5">
								Company
							</h4>
							<ul className="space-y-3">
								{companyLinks.map(({ label, href }) => (
									<li key={label}>
										<Link
											href={href}
											className="text-white/55 text-sm hover:text-white transition-colors duration-200 font-light">
											{label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Col 4 — Social */}
						<div>
							<h4 className="text-white/65 text-xs font-medium tracking-widest uppercase mb-5">
								Follow
							</h4>
							<ul className="space-y-3">
								{socialLinks.map(({ label, href, Icon }) => (
									<li key={label}>
										<a
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center gap-2 text-white/55 text-sm hover:text-white transition-colors duration-200 font-light">
											<Icon
												className="w-4 h-4"
												aria-hidden="true"
											/>
											{label}
										</a>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="border-t border-white/12 px-6 sm:px-10 lg:px-20 py-5">
					<div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
						<p className="text-white/30 text-xs font-light">
							All rights reserved.
						</p>
						<div className="flex gap-6">
							<Link
								href="/privacy"
								className="text-white/30 text-xs font-light hover:text-white/65 transition-colors duration-200">
								Privacy Policy
							</Link>
							<Link
								href="/terms"
								className="text-white/30 text-xs font-light hover:text-white/65 transition-colors duration-200">
								Terms of Service
							</Link>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default PremiumFooter;
