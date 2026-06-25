"use client";

import { useEffect, useState, startTransition } from "react";

const ITEMS = [
	{ id: "capabilities", label: "Stack" },
	{ id: "how-it-works", label: "How" },
	{ id: "destinations", label: "Atlas" },
	{ id: "creators", label: "Network" },
	{ id: "team", label: "Team" },
];

/**
 * Fixed right-edge section navigator: active dot expands + labels the current
 * section as you scroll (IntersectionObserver), and clicking jumps there.
 * Desktop only. No setState during render — observer drives it via startTransition.
 */
export default function SectionNav() {
	const [active, setActive] = useState("");

	useEffect(() => {
		const els = ITEMS.map((i) => document.getElementById(i.id)).filter(Boolean);
		if (!els.length) return;
		const obs = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) startTransition(() => setActive(e.target.id));
				});
			},
			{ rootMargin: "-45% 0px -45% 0px" }
		);
		els.forEach((el) => obs.observe(el));
		return () => obs.disconnect();
	}, []);

	const go = (id) => {
		const el = document.getElementById(id);
		if (!el) return;
		if (typeof window !== "undefined" && window.__lenis) {
			window.__lenis.scrollTo(el, { duration: 1.2 });
		} else {
			el.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<nav
			className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-[70] flex-col gap-4"
			aria-label="Page sections">
			{ITEMS.map((it) => {
				const on = active === it.id;
				return (
					<button
						key={it.id}
						onClick={() => go(it.id)}
						data-cursor
						aria-label={it.label}
						className="group flex items-center justify-end gap-3">
						<span
							className={`mono-label text-[10px] transition-opacity duration-300 ${
								on ? "opacity-100 text-signal" : "opacity-0 group-hover:opacity-70 text-bone-muted"
							}`}>
							{it.label}
						</span>
						<span
							className={`h-px transition-all duration-300 ${
								on ? "w-8 bg-signal" : "w-4 bg-bone/30 group-hover:w-6"
							}`}
						/>
					</button>
				);
			})}
		</nav>
	);
}
