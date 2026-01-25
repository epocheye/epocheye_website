"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Immediate load Hero as it's above the fold
import Hero from "@/components/sections/Hero";
import SocialProof from "@/components/sections/SocialProof";

// Lazy load below-the-fold components with loading states
const Problem = dynamic(() => import("@/components/sections/Problem"), {
	loading: () => <div className="min-h-screen bg-white" />,
	ssr: true,
});

// New Yodezeen-style premium sections
const SolutionSplit = dynamic(() => import("@/components/sections/SolutionSplit"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const PowerStatement = dynamic(() => import("@/components/sections/PowerStatement"), {
	loading: () => <div className="min-h-screen bg-[#F8F8F8]" />,
	ssr: true,
});

const VideoFeature = dynamic(() => import("@/components/sections/VideoFeature"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const MonumentsGallery = dynamic(() => import("@/components/sections/MonumentsGallery"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const WeCover = dynamic(() => import("@/components/sections/WeCover"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const GlobalReach = dynamic(() => import("@/components/sections/GlobalReach"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const CredibilityStatement = dynamic(() => import("@/components/sections/CredibilityStatement"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const FinalCTA = dynamic(() => import("@/components/sections/FinalCTA"), {
	loading: () => <div className="min-h-screen bg-[#0A0A0A]" />,
	ssr: true,
});

const PremiumFooter = dynamic(() => import("@/components/sections/PremiumFooter"), {
	loading: () => <div className="min-h-[50vh] bg-[#0A0A0A]" />,
	ssr: true,
});

// Legacy sections (can be re-enabled as needed)
const HowItWorks = dynamic(() => import("@/components/sections/HowItWorks"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const LaunchDestinations = dynamic(() => import("@/components/sections/LaunchDestinations"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const FAQ = dynamic(() => import("@/components/sections/FAQ"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const Waitlist = dynamic(() => import("@/components/sections/Waitlist"), {
	loading: () => <div className="min-h-screen bg-white" />,
	ssr: true,
});

const Solution = dynamic(() => import("@/components/sections/Solution"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const Features = dynamic(() => import("@/components/sections/Features"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const Testimonials = dynamic(() => import("@/components/sections/Testimonials"), {
	loading: () => <div className="min-h-screen bg-black" />,
	ssr: true,
});

const Footer = dynamic(() => import("@/components/sections/Footer"), {
	loading: () => <div className="min-h-[50vh] bg-black" />,
	ssr: true,
});

const Home = () => {
	return (
		<main className="flex-1 overflow-x-hidden bg-black" style={{ scrollSnapType: "y mandatory" }}>
			{/* Skip to main content for accessibility */}
			<a 
				href="#main-content" 
				className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-md focus:font-medium"
			>
				Skip to main content
			</a>
			
			<Hero />
			{/* <SocialProof /> */}
			<div id="main-content">
				<Suspense fallback={<div className="min-h-screen bg-white" />}>
					<Problem />
				</Suspense>
			</div>
			
			{/* New Yodezeen-style Premium Sections */}
			<Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<SolutionSplit />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-[#F8F8F8]" />}>
				<PowerStatement />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<VideoFeature />
			</Suspense>
			{/* <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<MonumentsGallery />
			</Suspense> */}
			<Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<WeCover />
			</Suspense>
			{/* <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<GlobalReach />
			</Suspense> */}
			<Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<CredibilityStatement />
			</Suspense>
			{/* <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A]" />}>
				<FinalCTA />
			</Suspense> */}
			
			{/* Premium Footer */}
			<Suspense fallback={<div className="min-h-[50vh] bg-[#0A0A0A]" />}>
				<PremiumFooter />
			</Suspense>

			{/* Legacy sections - commented out but available */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Solution />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Features />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<HowItWorks />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<LaunchDestinations />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-white" />}>
				<Waitlist />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<FAQ />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Testimonials />
			</Suspense> */}
			{/* <Suspense fallback={<div className="min-h-[50vh] bg-black" />}>
				<Footer />
			</Suspense> */}
		</main>
	);
};

export default Home;
