"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Above-the-fold (eager) — Hero stays untouched
import Hero from "@/components/sections/Hero";
import SmoothScroll from "@/components/fx/SmoothScroll";
import Journey from "@/components/home3d/Journey";

const EndFrame = dynamic(() => import("@/components/sections/EndFrame"), {
	loading: () => <div className="min-h-[60vh] bg-ink" />,
	ssr: true,
});

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
				{/* Below the hero: one cloud of points that becomes each section. */}
				<Journey />
				<Suspense fallback={<div className="min-h-[60vh] bg-ink" />}>
					<EndFrame />
				</Suspense>
			</SmoothScroll>
		</main>
	);
};

export default Home;
