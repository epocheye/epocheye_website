"use client";

import React from "react";

import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Solution from "@/components/sections/Solution";
import Features from "@/components/sections/Features";
import Testimonials from "@/components/sections/Testimonials";
import Waitlist from "@/components/sections/Waitlist";
import Footer from "@/components/sections/Footer";

const Home = () => {
	return (
		<section className="flex-1 overflow-x-hidden bg-black" style={{ scrollSnapType: "y mandatory" }}>
			<Hero />
			<Problem />
			<Solution />
			<Features />
			<Testimonials />
			{/* <Waitlist /> */}
			<Footer />
		</section>
	);
};

export default Home;
