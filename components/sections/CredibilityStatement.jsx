"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DarkBeamsBackground from "@/components/ui/DarkBeamsBackground";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
	{
		quote: "Finally an app that makes me feel like I'm actually there, not just taking a selfie in front of a ruin.",
		author: "Travel Content Creator",
		meta: "180k followers",
	},
	{
		quote: "The historical accuracy is impressive. We've been waiting for something like this for years.",
		author: "Heritage Tourism Board",
		meta: "Representative",
	},
	{
		quote: "This is what AR was always supposed to be used for. Genuinely transformative.",
		author: "Independent Heritage Researcher",
		meta: "Published author",
	},
];

const creatorsNews = [
	{
		title: "Creators Program Applications Are Open",
		description:
			"History and travel creators can now join the partner program, get a referral code, and start tracking live performance.",
		href: "https://creators.epocheye.com/signup",
		linkLabel: "Apply as a Creator",
		image: "/img9.webp",
		alt: "Creator filming a heritage monument",
	},
	{
		title: "Live Dashboard + Payout Tracking Enabled",
		description:
			"Early creators are now viewing clicks, conversions, and payout requests from one focused dashboard.",
		href: "https://creators.epocheye.com/login",
		linkLabel: "Creator Login",
		image: "/img10.webp",
		alt: "Ancient architecture featured in creator content",
	},
];

const CredibilityStatement = () => {
	const sectionRef = useRef(null);
	const contentRef = useRef(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const section = sectionRef.current;
		const content = contentRef.current;

		if (!section || !content) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						setIsInView(true);
						observer.unobserve(section);
					}
				});
			},
			{ threshold: 0.1, rootMargin: "100px 0px" },
		);

		observer.observe(section);

		const ctx = gsap.context(() => {
			gsap.set(content, { opacity: 0, y: 40 });
			gsap.to(content, {
				opacity: 1,
				y: 0,
				duration: 0.9,
				ease: "power2.out",
				scrollTrigger: {
					trigger: section,
					start: "top 60%",
					toggleActions: "play none none reverse",
				},
			});
		}, section);

		return () => {
			ctx.revert();
			observer.disconnect();
		};
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative flex items-center justify-center overflow-hidden py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20"
			style={{ backgroundColor: "#080808" }}>
			{/* Video Background */}
			{isInView ? (
				<video
					className="absolute inset-0 w-full h-full object-cover"
					src="/bg_2.mp4"
					autoPlay
					loop
					muted
					playsInline
					preload="metadata"
					aria-hidden="true"
				/>
			) : (
				<div
					className="absolute inset-0 w-full h-full bg-[#080808]"
					aria-hidden="true"
				/>
			)}

			<DarkBeamsBackground
				opacity={0.2}
				scrimOpacity={0.34}
				beamProps={{ beamWidth: 1.6, beamNumber: 8, speed: 0.5, rotation: 10 }}
			/>

			{/* Dark overlay */}
			<div className="absolute inset-0 bg-black/62" />

			<div ref={contentRef} className="relative z-10 max-w-6xl mx-auto w-full">
				{/* Header */}
				<div className="text-center mb-16">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/60 border border-white/20 rounded-full uppercase mb-6">
						What People Are Saying
					</span>
					<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
						Trusted by travelers and
						<br />
						<span className="font-semibold">historians alike</span>
					</h2>
				</div>

				{/* Creators program news */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
					{creatorsNews.map((news, i) => (
						<article
							key={i}
							className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/45 backdrop-blur-sm">
							<div className="relative h-32 sm:h-40 md:h-44 w-full overflow-hidden">
								<Image
									src={news.image}
									alt={news.alt}
									fill
									sizes="(max-width: 768px) 100vw, 50vw"
									className="object-cover"
								/>
								<div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent" />
							</div>
							<div className="p-6">
								<p className="text-white/50 text-[11px] font-semibold tracking-[0.18em] uppercase mb-2">
									Creators Program News
								</p>
								<h3 className="font-montserrat font-semibold text-white text-lg leading-tight mb-3">
									{news.title}
								</h3>
								<p className="text-white/62 text-sm leading-relaxed mb-5">
									{news.description}
								</p>
								<Link
									href={news.href}
									className="inline-flex items-center rounded-full border border-white/35 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase text-white transition-colors duration-300 hover:bg-white hover:text-black">
									{news.linkLabel}
								</Link>
							</div>
						</article>
					))}
				</div>

				{/* Testimonial Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
					{testimonials.map((t, i) => (
						<div
							key={i}
							className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-7 flex flex-col gap-4">
							<p className="text-white/80 text-sm sm:text-base leading-relaxed italic flex-1">
								&ldquo;{t.quote}&rdquo;
							</p>
							<div>
								<p className="text-white text-sm font-medium">
									— {t.author}
								</p>
								<p className="text-white/55 text-xs mt-0.5">{t.meta}</p>
							</div>
						</div>
					))}
				</div>

				{/* Credibility strip */}
				<div className="flex items-center justify-center gap-4 sm:gap-8">
					<div className="h-px flex-1 max-w-20 bg-white/15" />
					<p className="text-white/55 text-xs tracking-widest uppercase text-center font-light leading-relaxed">
						Verified by expert historians&nbsp;&nbsp;·&nbsp;&nbsp;100% accurate
						sources&nbsp;&nbsp;·&nbsp;&nbsp;Expert-curated content
					</p>
					<div className="h-px flex-1 max-w-20 bg-white/15" />
				</div>
			</div>
		</section>
	);
};

export default CredibilityStatement;
