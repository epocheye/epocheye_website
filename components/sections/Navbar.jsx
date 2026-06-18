import Image from "next/image";
import React from "react";
import Link from "next/link";
import logoWhite from "../../public/logo-white.png";
import { ArrowRight, Download, User } from "lucide-react";
import ShinyText from "../ShinyText";

const Navbar = ({ showLogo = true }) => {
	return (
		<nav
			className="w-full flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 font-instrument-sans relative"
			role="navigation"
			aria-label="Main navigation">
			<Link href="/" aria-label="EpochEye Home">
				<Image
					src={logoWhite}
					alt="EpochEye Logo"
					width={40}
					height={40}
					className="sm:w-[50px] sm:h-[50px] md:w-[60px] md:h-[60px]"
					priority
				/>
			</Link>

			<div
				className={`absolute left-1/2 transform -translate-x-1/2 transition-opacity duration-300 hidden sm:block ${
					showLogo ? "opacity-100" : "opacity-0"
				}`}
				aria-hidden={!showLogo}>
				<ShinyText
					text="Epocheye"
					disabled={false}
					speed={2}
					className="text-xl sm:text-2xl md:text-3xl font-medium text-white leading-tight font-montserrat"
				/>
			</div>

			{/* Right side: Download APK + Login + Creator CTA + Join Us */}
			<div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
				{/* Download App (Beta) — served from CloudFront (the 111 MB APK is too
				    large for the git repo / Vercel). The object's Content-Disposition:
				    attachment header forces the download even cross-origin. */}
				{/* <a
					href="https://d2d3syfid51acn.cloudfront.net/app-release.apk"
					download="Epocheye.apk"
					aria-label="Download the Epocheye Android APK (beta)"
					className="px-3 py-2 sm:px-4 sm:py-2.5 text-white text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2 transition-all border border-white/20 hover:border-white/30">
					<Download className="w-4 h-4" aria-hidden="true" />
					<span className="hidden sm:inline">Download App</span>
				</a> */}

				{/* Login Button */}
				<Link
					href="/login"
					className="px-3 py-2 sm:px-4 sm:py-2.5 text-white text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2 transition-all border border-white/20 hover:border-white/30">
					<User className="w-4 h-4" aria-hidden="true" />
					<span className="hidden sm:inline">Login</span>
				</Link>

				{/* Creators Program Button */}
				<Link
					href="https://creators.epocheye.com"
					aria-label="Apply to the Epocheye Creators Program"
					className="hidden md:flex px-3 py-2 sm:px-4 sm:py-2.5 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] rounded-full border border-white/30 hover:border-white/45 bg-black/15 hover:bg-black/30 transition-all whitespace-nowrap items-center gap-2">
					Creators Program
				</Link>

				{/* Early Access — primary CTA */}
				{/* <Link
					href="/early-access"
					aria-label="Get early access to Epocheye"
					className="px-3 py-2 sm:px-4 sm:py-2.5 text-black text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] rounded-full bg-white hover:bg-white/90 transition-all whitespace-nowrap flex items-center gap-2">
					Early Access
					<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
				</Link> */}

				{/* Join Us Button */}
				{/* <button
					type="button"
					title="Join Us in making the Heritage Tourism an Experience"
					aria-label="Join Us in making the Heritage Tourism an Experience"
					className="px-3 py-2 sm:px-4 sm:py-3 text-white text-xs sm:text-sm md:text-base bg-black/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-black/30 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
					data-tally-open="mZ4Aa0"
					data-tally-layout="modal"
					data-tally-width="600"Replace the Join Waitlist button in the hero section of the home page with an Early Access button. Clicking it should redirect to the early access route.
					data-tally-auto-close="1000"
					data-tally-transparent-background="1"
					data-tally-form-events-forwarding="1">
					<span className="hidden sm:inline">Join our team</span>
					<span className="sm:hidden">Join our team</span>
					<ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
				</button> */}
			</div>
		</nav>
	);
};

export default Navbar;
