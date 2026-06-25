"use client";

import Link from "next/link";
import KineticText from "@/components/fx/KineticText";
import MagneticButton from "@/components/fx/MagneticButton";
import GridFloor from "@/components/fx/GridFloor";
import Scroll3D from "@/components/fx/Scroll3D";

const COLUMNS = [
	{
		head: "Product",
		links: [
			["Features", "#capabilities"],
			["How It Works", "#how-it-works"],
			["Download", "https://play.google.com/store/apps/details?id=com.epocheye"],
			["Creators", "https://creators.epocheye.com"],
		],
	},
	{
		head: "Company",
		links: [
			["About", "/about"],
			["Blog", "/blog"],
			["Investors", "mailto:sambit@epocheye.app"],
			["Contact", "mailto:sambit@epocheye.app"],
		],
	},
	{
		head: "Follow",
		links: [
			["Twitter / X", "https://x.com/sambitsingha01"],
			["Instagram", "https://instagram.com"],
			["LinkedIn", "https://www.linkedin.com/company/epocheye/"],
		],
	},
];

/**
 * Closing frame — viewport-scale kinetic CTA over an animated 3D grid floor, a
 * magnetic Early-Access button and a brutalist hairline footer grid that swings
 * in from depth.
 */
export default function EndFrame() {
	return (
		<footer className="relative w-full bg-ink px-6 sm:px-10 pt-28 sm:pt-36 pb-10 overflow-hidden">
			<GridFloor className="z-0" opacity={0.35} />
			<div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink z-0" />

			<div className="relative z-10">
				<KineticText
					text="See the world"
					as="h2"
					split="char"
					className="font-serif text-bone leading-[0.92] kin-spaced"
					style={{ fontSize: "clamp(48px, 10vw, 134px)" }}
				/>
				<KineticText
					text="differently."
					as="h2"
					split="char"
					delay={0.05}
					className="font-serif italic text-signal glow-signal leading-[0.92] mb-12 kin-spaced"
					style={{ fontSize: "clamp(48px, 10vw, 134px)" }}
				/>

				<MagneticButton
					as={Link}
					href="/early-access"
					className="mb-24 px-10 sm:px-12 py-5 sm:py-6 bg-signal text-ink mono-label text-sm sm:text-base box-glow-signal">
					Get Early Access →
				</MagneticButton>

				<Scroll3D as="div" className="grid grid-cols-2 md:grid-cols-4 gap-10 border-t border-rule pt-12">
					<div className="flex flex-col gap-4 col-span-2 md:col-span-1">
						<span className="font-serif text-bone text-2xl">Epocheye</span>
						<span className="font-mono text-xs leading-relaxed text-bone-muted">See the past. Live.</span>
						<span className="font-mono text-xs text-bone-faint mt-2">© 2026 Epocheye</span>
					</div>
					{COLUMNS.map((col) => (
						<div key={col.head} className="flex flex-col gap-3">
							<span className="mono-label text-[11px] text-bone-faint mb-1">{col.head}</span>
							{col.links.map(([label, href]) => {
								const cls =
									"font-mono text-sm text-bone-muted hover:text-signal transition-colors w-fit";
								if (href.startsWith("/")) {
									return (
										<Link key={label} href={href} className={cls}>
											{label}
										</Link>
									);
								}
								if (href.startsWith("http")) {
									return (
										<a
											key={label}
											href={href}
											target="_blank"
											rel="noopener noreferrer"
											className={cls}>
											{label}
										</a>
									);
								}
								return (
									<a key={label} href={href} className={cls}>
										{label}
									</a>
								);
							})}
						</div>
					))}
				</Scroll3D>

				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-rule mt-14 pt-6 mono-label text-[11px] text-bone-faint">
					<span>© 2026 Epocheye — All rights reserved</span>
					<span className="flex gap-2">
						<Link href="/privacy" className="hover:text-signal transition-colors">
							Privacy
						</Link>
						<span aria-hidden>/</span>
						<Link href="/terms" className="hover:text-signal transition-colors">
							Terms
						</Link>
					</span>
				</div>
			</div>
		</footer>
	);
}
