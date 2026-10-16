"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const EASE = [0.22, 1, 0.36, 1];

// Slow fade with a small rise. Nothing bouncy.
export function Reveal({ children, className, delay = 0 }) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 14 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-80px" }}
			transition={{ duration: 1.4, delay, ease: EASE }}>
			{children}
		</motion.div>
	);
}

// A full-bleed image that drifts slightly slower than the page.
export function ParallaxImage({ src, alt, className = "", sizes = "100vw", priority = false, strength = 60 }) {
	const ref = useRef(null);
	const reduce = useReducedMotion();
	const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
	const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-strength, strength]);
	return (
		<div ref={ref} className={`relative overflow-hidden ${className}`}>
			<motion.div className="absolute inset-x-0" style={{ y, top: -strength, bottom: -strength }}>
				<Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
			</motion.div>
		</div>
	);
}
