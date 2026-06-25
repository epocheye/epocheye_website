"use client";

import { motion, useScroll, useSpring } from "motion/react";

/**
 * Thin acid-lime scroll-progress beam pinned to the top of the viewport.
 * Spring-smoothed so it glides with the Lenis scroll.
 */
export default function ScrollProgress() {
	const { scrollYProgress } = useScroll();
	const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

	return (
		<motion.div
			aria-hidden="true"
			style={{ scaleX }}
			className="fixed top-0 left-0 right-0 z-[9998] h-[2px] origin-left bg-signal"
		/>
	);
}
