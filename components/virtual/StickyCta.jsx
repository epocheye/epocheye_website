"use client";

import { startTransition, useEffect, useState } from "react";
import { scrollToForm } from "./scrollToForm";
import { trackVirtual } from "./track";

// Phones only: once the opening has scrolled away, a bar at the bottom brings the form back. It
// steps aside while a form is on screen, so it never covers the field it points to.
export default function StickyCta({ label }) {
	const [show, setShow] = useState(false);

	useEffect(() => {
		const hero = document.getElementById("hero");
		const forms = Array.from(document.querySelectorAll("[data-early-access]"));
		if (!hero) return undefined;
		const seen = new Set();
		let heroVisible = true;
		const update = () => startTransition(() => setShow(!heroVisible && seen.size === 0));
		const heroIo = new IntersectionObserver(([entry]) => {
			heroVisible = entry.isIntersecting;
			update();
		});
		const formIo = new IntersectionObserver((entries) => {
			for (const e of entries) {
				if (e.isIntersecting) seen.add(e.target);
				else seen.delete(e.target);
			}
			update();
		});
		heroIo.observe(hero);
		forms.forEach((f) => formIo.observe(f));
		return () => {
			heroIo.disconnect();
			formIo.disconnect();
		};
	}, []);

	return (
		<div
			className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#f3e9d8]/10 bg-[#0b0907]/85 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-500 sm:hidden ${
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
