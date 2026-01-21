import Image from "next/image";
import React, { useEffect, useState } from "react";
import logoWhite from "../../public/logo-white.png";
import { ArrowRight, Download } from "lucide-react";
import ShinyText from "../ShinyText";

const Navbar = () => {
	return (
		<nav className="w-full flex items-center justify-between px-8 py-4 font-montserrat ">
			<Image src={logoWhite} alt="EpochEye Logo" width={60} height={60} />
			<ShinyText
				text="Epocheye"
				disabled={false}
				speed={2}
				className="text-3xl font-semibold text-white leading-tight"
			/>

			<button
				title="Get 1 month free + exclusive beta perks"
				className=" p-5  text-white text-sm sm:text-base bg-black/50 pointer-events-auto flex items-center gap-3 cursor-pointer "
				data-tally-open="mVR7OJ"
				data-tally-layout="modal"
				data-tally-width="600"
				data-tally-auto-close="1000"
				data-tally-form-events-forwarding="1">
				Join the waitlist
				<ArrowRight />
			</button>
		</nav>
	);
};

export default Navbar;
