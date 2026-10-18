"use client";

import { motion } from "motion/react";

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

