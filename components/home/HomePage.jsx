"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Above-the-fold (eager) — Hero stays untouched
import Hero from "@/components/sections/Hero";
import SmoothScroll from "@/components/fx/SmoothScroll";
import KineticManifesto from "@/components/sections/KineticManifesto";

// Below-the-fold (lazy) — Editorial Brutalist + 3D redesign
const ProofIndex = dynamic(() => import("@/components/sections/ProofIndex"), {
	loading: () => <div className="min-h-[60vh] bg-ink" />,
	ssr: true,
});

const CapabilityStack = dynamic(() => import("@/components/sections/CapabilityStack"), {
	loading: () => <div className="min-h-screen bg-ink-2" />,
	ssr: true,
});

const MonumentWall = dynamic(() => import("@/components/sections/MonumentWall"), {
	loading: () => <div className="min-h-[80vh] bg-ink" />,
	ssr: true,
});

const VideoShowcase = dynamic(() => import("@/components/sections/VideoShowcase"), {
	loading: () => <div className="min-h-[80vh] bg-ink" />,
	ssr: true,
});

const TimeScrubber = dynamic(() => import("@/components/sections/TimeScrubber"), {
	loading: () => <div className="min-h-screen bg-ink" />,
	ssr: true,
});

const ComingSoon = dynamic(() => import("@/components/sections/ComingSoon"), {
	loading: () => <div className="min-h-screen bg-ink-2" />,
	ssr: true,
});

const CreatorNetwork = dynamic(() => import("@/components/sections/CreatorNetwork"), {
	loading: () => <div className="min-h-[60vh] bg-ink" />,
	ssr: true,
});

const OperatorsInvestors = dynamic(() => import("@/components/sections/OperatorsInvestors"), {
	loading: () => <div className="min-h-[60vh] bg-ink-2" />,
	ssr: true,
});

const EndFrame = dynamic(() => import("@/components/sections/EndFrame"), {
	loading: () => <div className="min-h-[60vh] bg-ink" />,
	ssr: true,
});

const Home = () => {
	return (
		<main className="flex-1 overflow-x-hidden bg-ink">
			{/* Skip to main content for accessibility */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:font-medium">
				Skip to main content
			</a>

			<SmoothScroll>
				<Hero />

				<div id="main-content">
					<KineticManifesto />
				</div>

				<Suspense fallback={<div className="min-h-[60vh] bg-ink" />}>
					<ProofIndex />
				</Suspense>
				<Suspense fallback={<div className="min-h-screen bg-ink-2" />}>
					<CapabilityStack />
				</Suspense>
				<Suspense fallback={<div className="min-h-[80vh] bg-ink" />}>
					<MonumentWall />
				</Suspense>
				<Suspense fallback={<div className="min-h-[80vh] bg-ink" />}>
					<VideoShowcase />
				</Suspense>
				<Suspense fallback={<div className="min-h-screen bg-ink" />}>
					<TimeScrubber />
				</Suspense>
				<Suspense fallback={<div className="min-h-screen bg-ink-2" />}>
					<ComingSoon />
				</Suspense>
				<Suspense fallback={<div className="min-h-[60vh] bg-ink" />}>
					<CreatorNetwork />
				</Suspense>
				<Suspense fallback={<div className="min-h-[60vh] bg-ink-2" />}>
					<OperatorsInvestors />
				</Suspense>
				<Suspense fallback={<div className="min-h-[60vh] bg-ink" />}>
					<EndFrame />
				</Suspense>
			</SmoothScroll>
		</main>
	);
};

export default Home;
