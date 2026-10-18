"use client";

import { motion, useReducedMotion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1];

// Words rise out of a mask, one after another, when the line scrolls into view.
// Screen readers get the sentence whole.
export default function RevealText({ text, as: Tag = "p", className = "", delay = 0, stagger = 0.045 }) {
	const reduce = useReducedMotion();
	const words = text.split(" ");
	return (
		<Tag className={className}>
			<span className="sr-only">{text}</span>
			<motion.span
				aria-hidden="true"
				className="block"
				initial="hidden"
				whileInView="shown"
				viewport={{ once: true, margin: "-12% 0px" }}
				transition={{ staggerChildren: reduce ? 0 : stagger, delayChildren: delay }}>
				{words.map((word, i) => (
					<span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
						<motion.span
							className="inline-block"
							variants={{ hidden: { y: reduce ? 0 : "110%", opacity: reduce ? 0 : 1 }, shown: { y: 0, opacity: 1 } }}
							transition={{ duration: reduce ? 0.6 : 1.1, ease: EASE }}>
							{word}
						</motion.span>
						{i < words.length - 1 ? " " : null}
					</span>
				))}
			</motion.span>
		</Tag>
	);
}
