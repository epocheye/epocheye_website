"use client";

import Home from "@/components/maquette/Home";

export default function HomePage() {
	return (
		<>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:absolute focus:z-100 focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-black">
				Skip to main content
			</a>
			<Home />
		</>
	);
}
