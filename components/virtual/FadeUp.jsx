"use client";

import { motion } from "motion/react";

// Section entrance used across /virtual, same easing as the main site's Hero.
export default function FadeUp({ children, delay = 0, className }) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-60px" }}
			transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}>
			{children}
		</motion.div>
	);
}
