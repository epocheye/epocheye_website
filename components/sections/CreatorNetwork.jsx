"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import Scroll3D from "@/components/fx/Scroll3D";
import Tilt3D from "@/components/fx/Tilt3D";
import Marquee from "@/components/fx/Marquee";

function ParallaxImage({ src, alt }) {
	const ref = useRef(null);
	const reduce = useReducedMotion();
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
	const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

	return (
		<div ref={ref} className="relative overflow-hidden" style={{ height: "300px" }}>
			<motion.div className="absolute inset-x-0" style={{ top: "-12%", bottom: "-12%", y: reduce ? 0 : y }}>
				<Image
					src={src}
					alt={alt}
					fill
					sizes="(max-width: 768px) 100vw, 50vw"
					className="object-cover"
				/>
			</motion.div>
		</div>
	);
}

const CARDS = [
	{
		tag: "// Applications Open",
		title: "Creators Program is live",
		desc: "Turn heritage storytelling into income. Apply, get verified, earn on every booking you drive.",
		cta: "Apply as a Creator →",
		href: "https://creators.epocheye.com",
		img: "/img11.webp",
		offset: false,
	},
	{
		tag: "// Live Dashboard",
		title: "Payout tracking, in real time",
		desc: "Watch clicks, conversions, and UPI payouts update live. Full transparency on every rupee you earn.",
		cta: "Creator Login →",
		href: "https://creators.epocheye.com",
		img: "/img12.webp",
		offset: true,
	},
];

/**
 * Creator program — editorial split with offset, brutalist-framed parallax
 * image cards and a trust marquee.
 */
export default function CreatorNetwork() {
	return (
		<section id="creators" className="relative w-full bg-ink px-6 sm:px-10 py-24 sm:py-32">
			<div className="flex items-end justify-between border-b border-rule pb-6 mb-12">
				<span className="mono-label text-xs text-signal">05 — The Network</span>
				<span className="mono-label text-xs text-bone-muted">Creator Program</span>
			</div>

			<h2
				className="font-serif text-bone mb-14 leading-[0.98] kin-spaced"
				style={{ fontSize: "clamp(34px, 6vw, 74px)" }}>
				Built with the people
				<br />
				who tell these stories.
			</h2>

			<div className="grid md:grid-cols-2 gap-8 md:gap-10 items-start">
				{CARDS.map((c) => (
					<Scroll3D key={c.title} className={c.offset ? "md:mt-16" : ""}>
						<Tilt3D max={9} scale={1.03}>
							<a href={c.href} target="_blank" rel="noopener noreferrer" className="block border border-rule group shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
								<ParallaxImage src={c.img} alt={c.title} />
								<div className="flex flex-col gap-3 p-8 bg-ink-2">
									<span className="mono-label text-[11px] text-signal">{c.tag}</span>
									<h3 className="font-serif text-bone text-2xl sm:text-3xl">{c.title}</h3>
									<p className="font-mono text-sm leading-relaxed text-bone-muted">{c.desc}</p>
									<span className="mono-label text-xs text-signal mt-2 group-hover:translate-x-1 transition-transform">
										{c.cta}
									</span>
								</div>
							</a>
						</Tilt3D>
					</Scroll3D>
				))}
			</div>

			<div className="mt-16 border-t border-rule pt-8">
				<Marquee baseDuration={26}>
					<span className="inline-flex items-center mono-label text-xs text-bone-muted">
						{["Verified by historians", "100% accurate sources", "Expert-curated content"].map((t) => (
							<span key={t} className="inline-flex items-center">
								<span className="px-8">{t}</span>
								<span className="text-signal">/</span>
							</span>
						))}
					</span>
				</Marquee>
			</div>
		</section>
	);
}
