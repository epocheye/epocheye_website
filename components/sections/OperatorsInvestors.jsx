"use client";

import Scroll3D from "@/components/fx/Scroll3D";
import KineticText from "@/components/fx/KineticText";
import MagneticButton from "@/components/fx/MagneticButton";

/**
 * Team + investor CTA. Oversized kinetic headline, a founder block and an
 * investor pitch with a magnetic acid-lime button, split by a hairline grid.
 */
export default function OperatorsInvestors() {
	return (
		<section id="team" className="relative w-full bg-ink-2 px-6 sm:px-10 py-24 sm:py-32">
			<div className="flex items-end justify-between border-b border-rule pb-6 mb-10">
				<span className="mono-label text-xs text-signal">06 — The Team</span>
				<span className="mono-label text-xs text-bone-muted">
					Operators / Investors
				</span>
			</div>

			<KineticText
				text={"Operators,\nnot tourists."}
				as="h2"
				split="char"
				className="font-serif text-bone mb-16 kin-spaced"
				style={{ fontSize: "clamp(48px, 9.5vw, 126px)", lineHeight: 0.94 }}
			/>

			<div className="grid md:grid-cols-2 gap-px bg-rule border border-rule">
				{/* founder */}
				<Scroll3D className="flex flex-col gap-5 p-8 sm:p-12 bg-ink">
					<span className="font-serif text-bone text-4xl">Sambit Singha</span>
					<span className="mono-label text-xs text-signal">Founder &amp; CEO</span>
					<p className="font-mono text-sm leading-relaxed text-bone-muted max-w-md">
						Full-stack engineer and product builder. Shipped at two startups
						before building the Epocheye AR prototype from scratch.
					</p>
				</Scroll3D>

				{/* investor CTA */}
				<Scroll3D
					delay={0.1}
					className="flex flex-col justify-center gap-6 p-8 sm:p-12 bg-ink">
					<span className="mono-label text-xs text-signal">{"// Let's talk"}</span>
					<KineticText
						text="Investor or partner? Let's build the future of heritage."
						as="h3"
						split="word"
						className="font-serif text-bone kin-spaced"
						style={{ fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.1 }}
					/>
					<p className="font-mono text-sm leading-relaxed text-bone-muted">
						We&apos;re raising to scale coverage across continents. If you back
						deep-tech with cultural impact, we should talk.
					</p>
					<MagneticButton
						href="mailto:sambit@epocheye.app"
						className="self-start mt-2 px-10 py-5 bg-signal text-ink mono-label text-sm box-glow-signal">
						Get in Touch →
					</MagneticButton>
				</Scroll3D>
			</div>
		</section>
	);
}
