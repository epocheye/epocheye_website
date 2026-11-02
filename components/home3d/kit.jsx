"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Text, useTexture } from "@react-three/drei";

import { FONTS, PALETTE as P } from "./theme";
import { stationWeight } from "./stations";

export const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

export const setCursor = (v) => {
	document.body.style.cursor = v;
};

export const openUrl = (href) => {
	if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
	else window.location.href = href;
};

/** Troika text in the site's faces. */
export function T({ font = "mono", children, ...props }) {
	return (
		<Text font={FONTS[font]} anchorX="center" anchorY="middle" material-toneMapped={false} {...props}>
			{children}
		</Text>
	);
}

/** Serif display type stacked back into the scene, so it reads as solid, extruded letterforms. */
export function Extruded({ children, color = P.text, side = P.side, layers = 6, step = 0.03, font = "serif", ...props }) {
	return (
		<group>
			{Array.from({ length: layers }, (_, i) => layers - 1 - i).map((i) => (
				<T key={i} font={font} color={i === 0 ? color : side} position-z={-i * step} {...props}>
					{children}
				</T>
			))}
		</group>
	);
}

/** Mono section label: "02 — THE STACK". */
export function Label({ children, color = P.accent, ...props }) {
	return (
		<T font="mono" fontSize={0.17} letterSpacing={0.24} color={color} {...props}>
			{children}
		</T>
	);
}

/**
 * Pointer-reactive group: hover eases it toward the viewer, the pointer tilts
 * it, and a click opens `href`. The hover state lives in a ref so frames never
 * re-render React.
 */
export function Hoverable({ children, href, onClick, tilt = 0.25, lift = 0.4, scale = 1.04, ...props }) {
	const ref = useRef(null);
	const hover = useRef(false);
	useFrame((state, delta) => {
		const g = ref.current;
		if (!g) return;
		const on = hover.current;
		g.rotation.y = THREE.MathUtils.damp(g.rotation.y, on ? state.pointer.x * tilt : 0, 6, delta);
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, on ? -state.pointer.y * tilt * 0.6 : 0, 6, delta);
		g.position.z = THREE.MathUtils.damp(g.position.z, on ? lift : 0, 6, delta);
		g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, on ? scale : 1, 6, delta));
	});
	const clickable = Boolean(href || onClick);
	return (
		<group {...props}>
			<group
				ref={ref}
				onPointerOver={(e) => {
					e.stopPropagation();
					hover.current = true;
					if (clickable) setCursor("pointer");
				}}
				onPointerOut={() => {
					hover.current = false;
					setCursor("");
				}}
				onClick={
					clickable
						? (e) => {
								e.stopPropagation();
								if (onClick) onClick();
								else openUrl(href);
							}
						: undefined
				}>
				{children}
			</group>
		</group>
	);
}

/** A photo on a thin slab with a hairline frame, like the site's bordered image cards. */
export function Photo({ src, width, height, frame = P.ink, frameOpacity = 0.18, dim = 0.85 }) {
	const source = useTexture(src);
	// Cover-fit the image into the slab. The loader caches one texture per URL and
	// the same photo appears at different shapes, so each slab crops its own copy.
	const texture = useMemo(() => {
		const t = source.clone();
		t.colorSpace = THREE.SRGBColorSpace;
		const img = t.image;
		if (img?.width) {
			const a = img.width / img.height;
			const b = width / height;
			t.repeat.set(a > b ? b / a : 1, a > b ? 1 : a / b);
			t.offset.set((1 - t.repeat.x) / 2, (1 - t.repeat.y) / 2);
		}
		t.needsUpdate = true;
		return t;
	}, [source, width, height]);
	return (
		<group>
			<mesh position-z={-0.04}>
				<boxGeometry args={[width + 0.06, height + 0.06, 0.06]} />
				<meshBasicMaterial color={frame} transparent opacity={frameOpacity} />
			</mesh>
			<mesh>
				<planeGeometry args={[width, height]} />
				<meshBasicMaterial map={texture} color={[dim, dim, dim]} toneMapped={false} />
			</mesh>
		</group>
	);
}

/** Rises out of the floor and settles as the camera arrives at its station. */
export function Arrive({ progress, station, delay = 0, from = 1.4, children, ...props }) {
	const ref = useRef(null);
	const base = props.position?.[1] ?? 0;
	useFrame(() => {
		const g = ref.current;
		if (!g) return;
		const k = easeOut(stationWeight(progress.get(), station) * 1.6 - delay);
		g.rotation.x = (1 - k) * -1.2;
		g.position.y = base - (1 - k) * from;
	});
	return (
		<group ref={ref} {...props}>
			{children}
		</group>
	);
}
