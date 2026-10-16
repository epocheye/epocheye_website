"use client";

import { startTransition, useEffect, useState } from "react";
import { scrollToForm } from "./scrollToForm";
import { trackVirtual } from "./track";

// Phones only: once the hero has scrolled away, a bar at the bottom brings the form back.
export default function StickyCta({ label }) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const hero = document.getElementById("hero");
		if (!hero) return undefined;
		const io = new IntersectionObserver(([entry]) => startTransition(() => setShow(!entry.isIntersecting)));
		io.observe(hero);
		return () => io.disconnect();
	}, []);

	return (
		<div
			className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#2e1f16]/10 bg-[#f4efe6]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-500 sm:hidden ${
				show ? "translate-y-0" : "translate-y-full"
			}`}>
			<button
				type="button"
				onClick={() => {
					trackVirtual("virtual_sticky_cta");
					scrollToForm();
				}}
				className="w-full bg-[#c0614a] py-3.5 font-instrument-sans text-base font-medium text-white">
				{label}
			</button>
		</div>
	);
}
