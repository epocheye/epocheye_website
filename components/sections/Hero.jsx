import React from "react";
import LiquidEther from "../LiquidEther";
import ShinyText from "../ShinyText";
import Navbar from "./Navbar";
import { ArrowUpIcon, Download } from "lucide-react";

const Hero = () => {
	return (
		<div className="relative flex justify-center items-center m-auto bg-black h-screen overflow-hidden">
			{/* Background LiquidEther */}
			<div className="absolute inset-0 w-full h-full pointer-events-auto">
				<LiquidEther
					colors={["#fff", "#fff", "#fff"]}
					mouseForce={20}
					cursorSize={90}
					isViscous={false}
					viscous={30}
					iterationsViscous={32}
					iterationsPoisson={32}
					resolution={0.5}
					isBounce={false}
					autoDemo={true}
					autoSpeed={0.5}
					autoIntensity={2.2}
					takeoverDuration={0.25}
					autoResumeDelay={3000}
					autoRampDuration={0.6}
				/>
			</div>

			{/* Navbar at the top - full height within Hero */}
			<div className="absolute inset-0 z-50 pointer-events-none">
				<Navbar />
			</div>

			{/* Content Layer */}
			<div className="relative z-10 text-center px-6 max-w-5xl mx-auto font-montserrat flex flex-col items-center justify-center h-full">
				<p className="text-sm md:text-lg text-gray-400 font-sans font-light">
					Turn Your Smartphone Into a Time Machine
				</p>
				<ShinyText
					text="Epocheye"
					disabled={false}
					speed={2}
					className="text-6xl md:text-8xl font-semibold text-white mb-6 leading-tight"
				/>

				<button
					className="my-10 px-6 py-1 border border-white text-white rounded-full hover:bg-white hover:text-black transition duration-300 pointer-events-auto flex items-center gap-3 cursor-pointer"
					onClick={() => console.log("Button Clicked")}>
					<Download
						size={40}
						className="bg-white text-black rounded-full p-2 -ml-5"
					/>
					Join the waitlist
				</button>
			</div>
		</div>
	);
};

export default Hero;
