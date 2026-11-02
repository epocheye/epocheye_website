"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Above-the-fold (eager) — Hero stays untouched
import Hero from "@/components/sections/Hero";
import SmoothScroll from "@/components/fx/SmoothScroll";
import Journey from "@/components/home3d/Journey";

// The classic sections: only for browsers without WebGL, so only loaded then.
const KineticManifesto = dynamic(() => import("@/components/sections/KineticManifesto"), { loading: () => <div className="min-h-[60vh] bg-ink" />, ssr: true });
const ProofIndex = dynamic(() => import("@/components/sections/ProofIndex"), { loading: () => <div className="min-h-[60vh] bg-ink" />, ssr: true });
const CapabilityStack = dynamic(() => import("@/components/sections/CapabilityStack"), { loading: () => <div className="min-h-screen bg-ink-2" />, ssr: true });
const MonumentWall = dynamic(() => import("@/components/sections/MonumentWall"), { loading: () => <div className="min-h-[80vh] bg-ink" />, ssr: true });
const VideoShowcase = dynamic(() => import("@/components/sections/VideoShowcase"), { loading: () => <div className="min-h-[80vh] bg-ink" />, ssr: true });
const TimeScrubber = dynamic(() => import("@/components/sections/TimeScrubber"), { loading: () => <div className="min-h-screen bg-ink" />, ssr: true });
const ComingSoon = dynamic(() => import("@/components/sections/ComingSoon"), { loading: () => <div className="min-h-screen bg-ink-2" />, ssr: true });
const CreatorNetwork = dynamic(() => import("@/components/sections/CreatorNetwork"), { loading: () => <div className="min-h-[60vh] bg-ink" />, ssr: true });
const OperatorsInvestors = dynamic(() => import("@/components/sections/OperatorsInvestors"), { loading: () => <div className="min-h-[60vh] bg-ink-2" />, ssr: true });

const EndFrame = dynamic(() => import("@/components/sections/EndFrame"), {
	loading: () => <div className="min-h-[60vh] bg-ink" />,
	ssr: true,
});

function ClassicSections() {
	return (
		<div id="main-content">
			<KineticManifesto />
			<Suspense fallback={<div className="min-h-screen bg-ink" />}>
				<ProofIndex />
				<CapabilityStack />
				<MonumentWall />
				<VideoShowcase />
				<TimeScrubber />
				<ComingSoon />
				<CreatorNetwork />
				<OperatorsInvestors />
			</Suspense>
		</div>
	);
}

const Home = () => {
	return (
		<main className="flex-1 overflow-x-clip bg-ink">
			{/* Skip to main content for accessibility */}
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:font-medium">
				Skip to main content
			</a>

			<SmoothScroll>
				<Hero />
				{/* Below the hero: one 3D flight through every section. */}
				<Journey fallback={<ClassicSections />} />
				<Suspense fallback={<div className="min-h-[60vh] bg-ink" />}>
					<EndFrame />
				</Suspense>
			</SmoothScroll>
		</main>
	);
};

export default Home;
