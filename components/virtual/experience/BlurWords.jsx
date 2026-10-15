"use client";

import { motion } from "motion/react";

// Word-by-word blur reveal in the manner of React Bits' BlurText, driven by a `show` prop so the
// scroll position, not a one-shot in-view trigger, decides when a chapter's words appear and leave.
export default function BlurWords({ text, show, as = "p", className, stagger = 0.045, delay = 0 }) {
	const Tag = as === "h2" ? motion.h2 : as === "h1" ? motion.h1 : motion.p;
	const words = text.split(" ");
	return (
		<Tag className={className} initial={false} animate={show ? "in" : "out"} aria-label={text}>
			{words.map((word, i) => (
				<motion.span
					key={`${word}-${i}`}
					aria-hidden="true"
					className="inline-block whitespace-pre"
					variants={{
						out: { opacity: 0, filter: "blur(10px)", y: 14, transition: { duration: 0.3 } },
						in: {
							opacity: 1,
							filter: "blur(0px)",
							y: 0,
							transition: { duration: 0.7, delay: delay + i * stagger, ease: [0.22, 1, 0.36, 1] },
						},
					}}>
					{i < words.length - 1 ? `${word} ` : word}
				</motion.span>
			))}
		</Tag>
	);
}
