"use client";

import { scrollToForm } from "./scrollToForm";

// Always over dark: the 3D palace, then the dark sections after it. A soft top shade keeps the
// wordmark readable over bright sky.
export default function Header({ label }) {
	return (
		<header className="fixed inset-x-0 top-0 z-40 text-[#f3e9d8]">
			<div className="pointer-events-none absolute inset-0 -bottom-20 bg-linear-to-b from-black/60 to-transparent" aria-hidden="true" />
			<div className="relative mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:h-20 sm:px-10">
				<p className="font-instrument-serif text-2xl tracking-tight">Epocheye</p>
				<button
					type="button"
					onClick={scrollToForm}
					className="hidden border border-[#f3e9d8]/60 px-5 py-2 font-instrument-sans text-sm transition-colors duration-500 hover:border-[#d4a85a] hover:bg-[#d4a85a] hover:text-[#0b0907] sm:inline-block">
					{label}
				</button>
			</div>
		</header>
	);
}
