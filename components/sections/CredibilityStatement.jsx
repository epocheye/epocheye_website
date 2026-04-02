"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
	{
		quote:
			"Finally an app that makes me feel like I'm actually there, not just taking a selfie in front of a ruin.",
		author: "Travel Content Creator",
		meta: "180k followers",
	},
	{
		quote:
			"The historical accuracy is impressive. We've been waiting for something like this for years.",
		author: "Heritage Tourism Board",
		meta: "Representative",
	},
	{
		quote: "This is what AR was always supposed to be used for. Genuinely transformative.",
		author: "Independent Heritage Researcher",
		meta: "Published author",
	},
];

const CredibilityStatement = () => {
	const sectionRef = useRef(null);
	const contentRef = useRef(null);
	const videoRef = useRef(null);

	useEffect(() => {
		const section = sectionRef.current;
		const content = contentRef.current;
		const video = videoRef.current;

		if (!section || !content) return;

		if (video) {
			video.play().catch(() => {});
		}

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

		return () => ctx.revert();
	}, []);

	return (
		<section
			ref={sectionRef}
			className="relative flex items-center justify-center overflow-hidden py-24 sm:py-32 lg:py-40 px-6 sm:px-10 lg:px-20"
			style={{ backgroundColor: "#080808" }}>
			{/* Video Background */}
			<video
				ref={videoRef}
				className="absolute inset-0 w-full h-full object-cover"
				src="/bg_2.mp4"
				autoPlay
				loop
				muted
				playsInline
				preload="metadata"
				aria-hidden="true"
			/>

			{/* Dark overlay */}
			<div className="absolute inset-0 bg-black/75" />

			<div ref={contentRef} className="relative z-10 max-w-6xl mx-auto w-full">
				{/* Header */}
				<div className="text-center mb-16">
					<span className="inline-block px-3 py-1 text-xs font-medium tracking-widest text-white/40 border border-white/10 rounded-full uppercase mb-6">
						What People Are Saying
					</span>
					<h2 className="font-montserrat font-light text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
						Trusted by travelers and
						<br />
						<span className="font-semibold">historians alike</span>
					</h2>
				</div>

				{/* Testimonial Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
					{testimonials.map((t, i) => (
						<div
							key={i}
							className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-7 flex flex-col gap-4">
							<p className="text-white/70 text-sm sm:text-base leading-relaxed italic flex-1">
								&ldquo;{t.quote}&rdquo;
							</p>
							<div>
								<p className="text-white text-sm font-medium">— {t.author}</p>
								<p className="text-white/40 text-xs mt-0.5">{t.meta}</p>
							</div>
						</div>
					))}
				</div>

				{/* Credibility strip */}
				<div className="flex items-center justify-center gap-4 sm:gap-8">
					<div className="h-px flex-1 max-w-[80px] bg-white/8" />
					<p className="text-white/30 text-xs tracking-widest uppercase text-center font-light leading-relaxed">
						Verified by expert historians&nbsp;&nbsp;·&nbsp;&nbsp;100% accurate sources&nbsp;&nbsp;·&nbsp;&nbsp;Expert-curated content
					</p>
					<div className="h-px flex-1 max-w-[80px] bg-white/8" />
				</div>
			</div>
		</section>
	);
};

export default CredibilityStatement;
