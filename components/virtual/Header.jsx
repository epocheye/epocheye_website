"use client";

import { startTransition, useEffect, useState } from "react";
import { scrollToForm } from "./scrollToForm";

// Over the hero: white on a soft dark gradient, so it stays readable over bright sky.
// Past the hero: lime-white bar with teak text.
export default function Header({ label }) {
	const [solid, setSolid] = useState(false);

	useEffect(() => {
		const hero = document.getElementById("hero");
		if (!hero) return undefined;
		const io = new IntersectionObserver(([entry]) => startTransition(() => setSolid(!entry.isIntersecting)), {
			rootMargin: "-72px 0px 0px 0px",
		});
		io.observe(hero);
		return () => io.disconnect();
	}, []);

	return (
		<header
			className={`fixed inset-x-0 top-0 z-40 transition-colors duration-700 ${
				solid ? "bg-[#f4efe6]/95 text-[#2e1f16] shadow-[0_1px_0_rgba(46,31,22,0.08)] backdrop-blur" : "text-white"
			}`}>
			{!solid ? (
				<div className="pointer-events-none absolute inset-0 -bottom-16 bg-linear-to-b from-black/55 to-transparent" aria-hidden="true" />
			) : null}
			<div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
				<p className="font-instrument-serif text-2xl tracking-tight">Epocheye</p>
				<button
					type="button"
					onClick={scrollToForm}
					className={`hidden border px-5 py-2 font-instrument-sans text-sm transition-colors duration-500 sm:inline-block ${
						solid ? "border-[#c0614a] text-[#c0614a] hover:bg-[#c0614a] hover:text-white" : "border-white/80 hover:bg-white hover:text-[#2e1f16]"
					}`}>
					{label}
				</button>
			</div>
		</header>
	);
}
