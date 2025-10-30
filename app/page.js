"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

// Immediate load Hero as it's above the fold
import Hero from "@/components/sections/Hero";

// Lazy load below-the-fold components with loading states
const Problem = dynamic(() => import("@/components/sections/Problem"), {
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
		<section className="flex-1 overflow-x-hidden bg-black" style={{ scrollSnapType: "y mandatory" }}>
			<Hero />
			<Suspense fallback={<div className="min-h-screen bg-white" />}>
				<Problem />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Solution />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Features />
			</Suspense>
			<Suspense fallback={<div className="min-h-screen bg-black" />}>
				<Testimonials />
			</Suspense>
			<Suspense fallback={<div className="min-h-[50vh] bg-black" />}>
				<Footer />
			</Suspense>
		</section>
	);
};

export default Home;
