"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Above-the-fold (eager)
import Hero from "@/components/sections/Hero";
import TractionMarquee from "@/components/sections/TractionMarquee";

// Below-the-fold (lazy)
const TractionWall = dynamic(() => import("@/components/sections/TractionWall"), {
	loading: () => <div className="min-h-[60vh] bg-[#080808]" />,
	ssr: true,
});

const WhatWeDo = dynamic(() => import("@/components/sections/WhatWeDo"), {
	loading: () => <div className="min-h-[60vh] bg-[#0A0A0A]" />,
	ssr: true,
});

const HowItWorks = dynamic(() => import("@/components/sections/HowItWorks"), {
	loading: () => <div className="min-h-screen bg-[#080808]" />,
	ssr: true,
});

const GlobalReach = dynamic(() => import("@/components/sections/GlobalReach"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const PressWall = dynamic(() => import("@/components/sections/PressWall"), {
	loading: () => <div className="min-h-[60vh] bg-[#080808]" />,
	ssr: true,
});

const TeamAndInvestor = dynamic(() => import("@/components/sections/TeamAndInvestor"), {
	loading: () => <div className="min-h-[60vh] bg-[#0A0A0A]" />,
	ssr: true,
});

const PremiumFooter = dynamic(() => import("@/components/sections/PremiumFooter"), {
	loading: () => <div className="min-h-[50vh] bg-[#0A0A0A]" />,
	ssr: true,
});

const Home = () => {
	return (
		<main className="flex-1 overflow-x-hidden bg-black">
			{/* Skip to main content for accessibility */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:font-medium">
				Skip to main content
			</a>

			<Hero />
			<TractionMarquee />

			<div id="main-content">
				<Suspense fallback={<div className="min-h-[60vh] bg-[#080808]" />}>
					<TractionWall />
				</Suspense>
			</div>

			<Suspense fallback={<div className="min-h-[60vh] bg-[#0A0A0A]" />}>
				<WhatWeDo />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-[#080808]" />}>
				<HowItWorks />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<GlobalReach />
			</Suspense>
			<Suspense fallback={<div className="min-h-[60vh] bg-[#080808]" />}>
				<PressWall />
			</Suspense>
			<Suspense fallback={<div className="min-h-[60vh] bg-[#0A0A0A]" />}>
				<TeamAndInvestor />
			</Suspense>

			<Suspense fallback={<div className="min-h-[50vh] bg-[#0A0A0A]" />}>
				<PremiumFooter />
			</Suspense>
		</main>
	);
};

export default Home;
