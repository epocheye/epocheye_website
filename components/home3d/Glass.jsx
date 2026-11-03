"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";

// Frosted glass drifting through the space behind the cloud. The pieces rise
// past as you scroll down, the far ones slower than the near ones, so going
// down the page feels like sinking through a field of glass. Real refraction:
// each piece bends and blurs the tinted light behind it.

const SPAN = 34; // height of the column the pieces wrap around in
const FOV_TAN = Math.tan((35 / 2) * (Math.PI / 180));
const CAMERA_Z = 13;

const hash = (n) => {
	const x = Math.sin(n * 91.73) * 43758.5453;
	return x - Math.floor(x);
};

// What each piece is: a pane, a ring, a pebble, a knot, a capsule, a block.
const KINDS = ["pane", "ring", "pebble", "knot", "pane", "capsule", "block", "ring", "pebble", "pane", "knot", "block"];

function Piece({ kind }) {
	switch (kind) {
		case "pane":
			return (
				<RoundedBox args={[2.2, 3.1, 0.16]} radius={0.08} smoothness={4}>
					<GlassMaterial />
				</RoundedBox>
			);
		case "ring":
			return (
				<mesh>
					<torusGeometry args={[1.05, 0.3, 48, 128]} />
					<GlassMaterial />
				</mesh>
			);
		case "knot":
			return (
				<mesh>
					<torusKnotGeometry args={[0.75, 0.24, 220, 32]} />
					<GlassMaterial />
				</mesh>
			);
		case "capsule":
			return (
				<mesh>
					<capsuleGeometry args={[0.45, 1.5, 16, 32]} />
					<GlassMaterial />
				</mesh>
			);
		case "block":
			return (
				<RoundedBox args={[1.3, 1.3, 1.3]} radius={0.22} smoothness={5}>
					<GlassMaterial />
				</RoundedBox>
			);
		default:
			return (
				<mesh>
					<icosahedronGeometry args={[0.95, 6]} />
					<GlassMaterial />
				</mesh>
			);
	}
}

function GlassMaterial() {
	return (
		<meshPhysicalMaterial
			transmission={1}
			thickness={0.9}
			roughness={0.14}
			ior={1.45}
			clearcoat={1}
			clearcoatRoughness={0.05}
			iridescence={0.5}
			iridescenceIOR={1.35}
			attenuationColor="#f4ffe0"
			attenuationDistance={6}
			specularIntensity={1}
			envMapIntensity={2.4}
			color="#ffffff"
			// Background glass never hides the points in front of it.
			depthWrite={false}
		/>
	);
}

export default function GlassField({ track, count }) {
	const pieces = useMemo(
		() =>
			Array.from({ length: count }, (_, i) => ({
				kind: KINDS[i % KINDS.length],
				base: (i / count) * SPAN - SPAN / 2,
				side: i % 2 ? 1 : -1,
				spread: 0.5 + hash(i + 1) * 0.3, // share of the half-width out from the centre
				z: -6 - hash(i + 7) * 8,
				scale: 0.7 + hash(i + 13) * 0.6,
				spin: [hash(i + 19) - 0.5, hash(i + 23) - 0.5, hash(i + 29) - 0.5].map((v) => v * 0.5),
				tilt: [hash(i + 31) * 6, hash(i + 37) * 6, hash(i + 41) * 6],
			})),
		[count]
	);
	const refs = useRef([]);

	useFrame((state) => {
		const time = state.clock.elapsedTime;
		const aspect = state.size.width / state.size.height;
		const portrait = aspect < 0.9;
		const travel = (track.f + 1) * 2.6; // how far the column has risen
		pieces.forEach((p, i) => {
			const g = refs.current[i];
			if (!g) return;
			const depth = CAMERA_Z - p.z;
			const halfW = depth * FOV_TAN * aspect;
			const parallax = 1 - (-p.z - 6) / 16; // far pieces rise slower
			let y = p.base + travel * parallax + Math.sin(time * 0.3 + i) * 0.25;
			y = ((((y + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;
			const x = p.side * halfW * (portrait ? Math.min(1, p.spread * 1.15) : p.spread) + state.pointer.x * 0.4 * parallax;
			g.position.set(x, y + state.pointer.y * 0.25 * parallax, p.z);
			g.rotation.set(p.tilt[0] + time * p.spin[0], p.tilt[1] + time * p.spin[1], p.tilt[2] + time * p.spin[2]);
			g.scale.setScalar(p.scale * (portrait ? 0.75 : 1));
		});
	});

	return (
		<>
			{/* A studio of soft lights for the glass to catch: no image to download. */}
			<Environment resolution={256} frames={1}>
				<Lightformer form="rect" intensity={8} position={[0, 7, -2]} rotation-x={Math.PI / 2} scale={[16, 4, 1]} />
				<Lightformer form="rect" intensity={4} position={[-8, 0, 3]} rotation-y={Math.PI / 2} scale={[12, 2.5, 1]} />
				<Lightformer form="rect" intensity={4} position={[8, -1, 3]} rotation-y={-Math.PI / 2} scale={[12, 2.5, 1]} />
				<Lightformer form="ring" color="#ccff00" intensity={5} position={[3, -3, 7]} scale={3} />
				<Lightformer form="circle" intensity={4} position={[-3, 2, 9]} scale={2.5} />
				<Lightformer form="rect" intensity={2} position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[16, 4, 1]} />
			</Environment>
			{pieces.map((p, i) => (
				<group
					key={i}
					ref={(el) => {
						refs.current[i] = el;
					}}>
					<Piece kind={p.kind} />
				</group>
			))}
		</>
	);
}
