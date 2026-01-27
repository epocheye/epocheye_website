import Image from "next/image";
import React from "react";
import Link from "next/link";
import logoWhite from "../../public/logo-white.png";
import { ArrowRight, User } from "lucide-react";
import ShinyText from "../ShinyText";
import { NotificationBell } from "../notifications";

const Navbar = ({ showLogo = true }) => {
	return (
		<nav
			className="w-full flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 font-montserrat relative"
			role="navigation"
			aria-label="Main navigation">
			<a href="/" aria-label="EpochEye Home">
				<Image
					src={logoWhite}
					alt="EpochEye Logo"
					width={40}
					height={40}
					className="sm:w-[50px] sm:h-[50px] md:w-[60px] md:h-[60px]"
					priority
				/>
			</a>

			<div
				className={`absolute left-1/2 transform -translate-x-1/2 transition-opacity duration-300 hidden sm:block ${
					showLogo ? "opacity-100" : "opacity-0"
				}`}
				aria-hidden={!showLogo}>
				<ShinyText
					text="Epocheye"
					disabled={false}
					speed={2}
					className="text-xl sm:text-2xl md:text-3xl font-medium text-white leading-tight"
				/>
			</div>

			{/* Right side: Login + Notification Bell + Join Us */}
			<div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
				{/* Login Button */}
				<Link
					href="/login"
					className="px-3 py-2 sm:px-4 sm:py-2.5 text-white text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2 transition-all border border-white/20 hover:border-white/30"
				>
					<User className="w-4 h-4" aria-hidden="true" />
					<span className="hidden sm:inline">Login</span>
				</Link>

				{/* Notification Bell */}
				<NotificationBell />

				{/* Join Us Button */}
				<button
					type="button"
					title="Join Us in making the Heritage Tourism an Experience"
					aria-label="Join Us in making the Heritage Tourism an Experience"
					className="px-3 py-2 sm:px-4 sm:py-3 text-white text-xs sm:text-sm md:text-base bg-black/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-black/30 transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
					data-tally-open="mZ4Aa0"
					data-tally-layout="modal"
					data-tally-width="600"
					data-tally-auto-close="1000"
					data-tally-transparent-background="1"
					data-tally-form-events-forwarding="1">
					<span className="hidden sm:inline">Join us</span>
					<span className="sm:hidden">Join us</span>
					<ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
				</button>
			</div>
		</nav>
	);
};

export default Navbar;
