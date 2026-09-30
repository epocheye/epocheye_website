"use client";

import Image from "next/image";
import Link from "next/link";

import Scroll3D from "@/components/fx/Scroll3D";
import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import logoStpi from "../../public/logo-stpi.png";
import logoAws from "../../public/logo-aws.png";
import logoDraper from "../../public/logo-draper.png";

const NUM_STYLE = { fontSize: "clamp(46px, 7.5vw, 106px)" };

/**
 * Backer lockup. Heights are per-logo and deliberately unequal: each source PNG
 * carries a different amount of baked-in transparent padding, so matching the
 * canvas heights would not match what the eye sees. Measured ink height as a
 * share of canvas: STPI 56%, AWS 34%, Draper 98% — the values below land all
 * three marks at ~18px (mobile) / ~28px (sm+) of visible ink, with the Draper
 * disc intentionally ~1.35x taller, as roundels read smaller than wordmarks.
 * The negative margins cancel the horizontal padding baked into the AWS and
 * Draper files so the gaps look even and the strip ends flush right, in line
 * with the numerals above. Re-measure if any logo file is re-exported.
 */
function BackerLogos() {
	return (
		<span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-3 sm:gap-x-6">
			<Image
				src={logoStpi}
				alt="Software Technology Parks of India"
				width={200}
				height={200}
				className="h-[34px] w-auto shrink-0 sm:h-[52px]"
			/>
			<Image
				src={logoAws}
				alt="Amazon Web Services"
				width={225}
				height={225}
				className="-mx-2 h-[54px] w-auto shrink-0 sm:-mx-3 sm:h-[84px]"
			/>
			<Image
				src={logoDraper}
				alt="Draper Startup House"
				width={653}
				height={382}
				className="-mr-1.5 h-[26px] w-auto shrink-0 sm:-mr-2.5 sm:h-[40px]"
			/>
		</span>
	);
}

// Where the app works, each linked to its sourced monument page. Names are exact
// (docs/canonical_public_claims.md); no counts are shown here.
function LiveMonuments() {
	return (
		<span className="flex flex-col items-start gap-2 text-left sm:items-end sm:gap-3 sm:text-right">
			{LIVE_MONUMENTS.map((m) => (
				<Link
					key={m.slug}
					href={`/monuments/${m.slug}`}
					className="font-serif text-bone leading-tight transition-colors hover:text-signal"
					style={{ fontSize: "clamp(24px, 3.6vw, 48px)" }}>
					{m.name}
					<span className="mono-label ml-3 align-middle text-[10px] sm:text-xs text-bone-muted">{m.city}</span>
				</Link>
			))}
		</span>
	);
}

const ROWS = [
	{
		k: "00 / Live at",
		// stacked on phones so the names don't wrap word by word beside the label
		align: "flex-col items-start sm:flex-row",
		style: {},
		node: <LiveMonuments />,
	},
	{
		k: "01 / Backed by",
		align: "items-center",
		// same clamp as the numerals, as a floor — keeps the ledger row rhythm
		style: { minHeight: NUM_STYLE.fontSize },
		node: <BackerLogos />,
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
				<span className="mono-label text-xs text-signal">01 — Where it works</span>
				<span className="mono-label text-xs text-bone-muted">Index / The Signal</span>
			</div>

			{ROWS.map((row, i) => (
				<Scroll3D
					key={row.k}
					delay={i * 0.05}
					rotate={28}
					z={160}
					className={`flex ${row.align} justify-between gap-6 py-6 sm:py-7 ${
						i < ROWS.length - 1 ? "border-b border-rule" : ""
					}`}>
					<span className="mono-label text-[11px] sm:text-sm text-bone-muted shrink-0">
						{row.k}
					</span>
					<span style={row.style} className="text-right">
						{row.node}
					</span>
				</Scroll3D>
			))}
		</section>
	);
}
