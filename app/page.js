"use client";

import React from "react";

import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Solution from "@/components/sections/Solution";

const Home = () => {
	return (
		<section className="flex-1 overflow-x-hidden" style={{ scrollSnapType: "y mandatory" }}>
			<Hero />
			<Problem />
			<Solution />
		</section>
	);
};

export default Home;
