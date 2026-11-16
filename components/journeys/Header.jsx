"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Button from "./Button";

gsap.registerPlugin(ScrollTrigger);

// Fixed, transparent. Hides on scroll down, returns on scroll up.
export default function Header({ onReserve }) {
	const ref = useRef(null);

	useGSAP(() => {
		const el = ref.current;
		const st = ScrollTrigger.create({
			start: 0,
			end: "max",
			onUpdate: (self) => {
				const hidden = self.direction === 1 && self.scroll() > 120;
				el.dataset.hidden = hidden ? "true" : "false";
			},
		});
		return () => st.kill();
	});

	return (
		<header ref={ref} className="jr-header" data-hidden="false">
			<a href="#top" className="jr-wordmark" aria-label="Epocheye Journeys, back to top">
				Epocheye
			</a>
			<Button small onClick={() => onReserve("header")}>
				Reserve
			</Button>
		</header>
	);
}
