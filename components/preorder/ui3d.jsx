"use client";

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
