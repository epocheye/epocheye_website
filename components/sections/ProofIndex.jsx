"use client";

import Scroll3D from "@/components/fx/Scroll3D";
import CountUp from "@/components/fx/CountUp";

const NUM = "font-serif text-bone leading-none";
const NUM_STYLE = { fontSize: "clamp(46px, 7.5vw, 106px)" };

const ROWS = [
	{ k: "00 / On the waitlist", node: <CountUp value={10000} suffix="+" className={NUM} /> },
	{ k: "01 / Field testers", node: <CountUp value={50} suffix="+" className={NUM} /> },

	{
		k: "03 / Backed by",
		node: <span className="font-serif text-bone leading-none">STPI · AWS</span>,
	},
];

/**
 * Traction as an editorial ledger — hairline rows, mono label left, giant
 * count-up number right. No cards.
 */
export default function ProofIndex() {
	return (
		<section className="relative w-full bg-ink px-6 sm:px-10 py-24 sm:py-32">
			<div className="flex items-end justify-between border-b border-rule pb-6 mb-4">
				<span className="mono-label text-xs text-signal">01 — Traction</span>
				<span className="mono-label text-xs text-bone-muted">Index / The Signal</span>
			</div>

			{ROWS.map((row, i) => (
				<Scroll3D
					key={row.k}
					delay={i * 0.05}
					rotate={28}
					z={160}
					className={`flex items-baseline justify-between gap-6 py-6 sm:py-7 ${
						i < ROWS.length - 1 ? "border-b border-rule" : ""
					}`}>
					<span className="mono-label text-[11px] sm:text-sm text-bone-muted shrink-0">
						{row.k}
					</span>
					<span style={NUM_STYLE} className="text-right">
						{row.node}
					</span>
				</Scroll3D>
			))}
		</section>
	);
}
