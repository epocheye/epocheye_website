"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";

import { FONTS, FONT_SCALE } from "./theme";

export const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

export const setCursor = (v) => {
	document.body.style.cursor = v;
};

/** Troika text with the page's faces; `fontSize` is in world units before FONT_SCALE. */
export function T({ font = "body", fontSize, children, ...props }) {
	return (
		<Text
			font={FONTS[font]}
			fontSize={fontSize * FONT_SCALE[font]}
			anchorX="center"
			anchorY="middle"
			material-toneMapped={false}
			{...props}>
			{children}
		</Text>
	);
}

/**
 * Display type with depth: the word is stacked `layers` times back into the
 * scene in a darker shade, so it reads as a solid, extruded letterform.
 */
export function Extruded({ children, color, side, layers = 7, step = 0.035, ...props }) {
	return (
		<group>
			{Array.from({ length: layers }, (_, i) => layers - 1 - i).map((i) => (
				<T key={i} font="display" color={i === 0 ? color : side} position-z={-i * step} {...props}>
					{children}
				</T>
			))}
		</group>
	);
}

/**
 * Editorial line reveal: the type rises into a window one line tall, as if
 * from behind a mask. `progress()` (0–1) is read every frame and the window is
 * set through troika's clipRect, so nothing re-lays out. Children sit at y 0,
 * centred on the line (the default anchorY).
 */
export function Reveal({ progress, height, children, ...props }) {
	const inner = useRef(null);
	useFrame(() => {
		const g = inner.current;
		if (!g) return;
		const k = easeOut(progress());
		const offset = -(1 - k) * height * 1.15;
		g.position.y = offset;
		g.traverse((o) => {
			if (!("clipRect" in o) || !o.isMesh) return;
			let y = 0;
			for (let n = o; n && n !== g; n = n.parent) y += n.position.y;
			const lo = -height / 2 - offset - y;
			o.clipRect = [-1e3, lo, 1e3, lo + height];
		});
	});
	return (
		<group {...props}>
			<group ref={inner}>{children}</group>
		</group>
	);
}
