"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { usePalette } from "./theme";

/* ───────────────────────── Konark point-cloud scan ───────────────────────── */

const POINTS_URL = "/preorder/konark-points.bin";

/** Baked by scripts/build-preorder-points.mjs: Int16 x,y,z, unit-normalised. */
function usePointCloud() {
	const [geometry, setGeometry] = useState(null);
	useEffect(() => {
		let alive = true;
		fetch(POINTS_URL)
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				if (!alive) return;
				const q = new Int16Array(buf);
				const n = q.length / 3;
				const pos = new Float32Array(q.length);
				const scatter = new Float32Array(q.length);
				const rand = new Float32Array(n);
				for (let i = 0; i < n; i += 1) {
					pos[i * 3] = q[i * 3] / 32767;
					pos[i * 3 + 1] = q[i * 3 + 1] / 32767;
					pos[i * 3 + 2] = q[i * 3 + 2] / 32767;
					// Start scattered on a wide shell; the scan pulls them into shape.
					const th = Math.random() * Math.PI * 2;
					const ph = Math.acos(2 * Math.random() - 1);
					const r = 2.2 + Math.random() * 2.5;
					scatter[i * 3] = r * Math.sin(ph) * Math.cos(th);
					scatter[i * 3 + 1] = r * Math.cos(ph);
					scatter[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
					rand[i] = Math.random();
				}
				const g = new THREE.BufferGeometry();
				g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
				g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
				g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
				g.computeBoundingSphere();
				setGeometry(g);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return geometry;
}

const CLOUD_VERT = /* glsl */ `
	uniform float uTime;
	uniform float uAssemble;
	uniform float uScan;
	uniform float uSize;
	uniform float uPixelRatio;
	attribute vec3 aScatter;
	attribute float aRand;
	varying float vScan;
	varying float vAlpha;
	void main() {
		float t = clamp((uAssemble - aRand * 0.45) / 0.55, 0.0, 1.0);
		t = t * t * (3.0 - 2.0 * t);
		vec3 p = mix(aScatter, position, t);
		p += 0.004 * vec3(sin(uTime * 2.0 + aRand * 40.0), cos(uTime * 1.7 + aRand * 30.0), 0.0);
		vScan = 1.0 - smoothstep(0.0, 0.03, abs(position.y - uScan));
		vAlpha = 0.35 + 0.65 * t;
		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		float depth = -mv.z;
		// Scattered points can drift right up to the camera: cap their size and
		// fade them out there, or a few huge additive sprites flood the screen.
		vAlpha *= smoothstep(0.8, 3.0, depth);
		gl_PointSize = min(uSize * uPixelRatio * (1.0 + vScan * 0.7) / max(depth, 0.001), 10.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const CLOUD_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform vec3 uScanColor;
	uniform float uOpacity;
	varying float vScan;
	varying float vAlpha;
	void main() {
		vec2 c = gl_PointCoord - 0.5;
		float d = length(c);
		if (d > 0.5) discard;
		float core = 1.0 - smoothstep(0.1, 0.5, d);
		vec3 col = mix(uColor, uScanColor * 1.1, vScan);
		gl_FragColor = vec4(col, core * uOpacity * vAlpha * (0.55 + 0.35 * vScan));
	}
`;

/**
 * Konark's Jagamohana as a live hologram: points assemble out of a scattered
 * shell (driven by `assemble`, 0–1) while an amber scan line sweeps the height.
 */
export function KonarkScan({ assemble, size = 26, ...props }) {
	const t = usePalette();
	const geometry = usePointCloud();
	const mat = useRef(null);
	const group = useRef(null);
	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uAssemble: { value: 0 },
			uScan: { value: -1 },
			uSize: { value: size },
			uPixelRatio: { value: 1 },
			uColor: { value: new THREE.Color() },
			uScanColor: { value: new THREE.Color() },
			uOpacity: { value: 1 },
		}),
		[size]
	);

	useFrame((state, delta) => {
		const m = mat.current;
		if (!m) return;
		const u = m.uniforms;
		const time = state.clock.elapsedTime;
		u.uTime.value = time;
		u.uPixelRatio.value = state.gl.getPixelRatio();
		u.uAssemble.value = assemble?.get ? assemble.get() : 1;
		u.uScan.value = -0.7 + ((time * 0.28) % 1.6);
		u.uColor.value.set(t.points);
		u.uScanColor.value.set(t.amber);
		u.uOpacity.value = t.mode === "dark" ? 0.9 : 0.75;
		if (group.current) group.current.rotation.y += delta * 0.12;
	});

	return (
		<group {...props}>
			<group ref={group}>
				{geometry && (
					<points geometry={geometry} frustumCulled={false}>
						<shaderMaterial
							ref={mat}
							uniforms={uniforms}
							vertexShader={CLOUD_VERT}
							fragmentShader={CLOUD_FRAG}
							transparent
							depthWrite={false}
							blending={t.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
						/>
					</points>
				)}
			</group>
		</group>
	);
}

/* ───────────────────────── Holographic glass ───────────────────────── */

const HOLO_VERT = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
// Glass with a lit border, moving scanlines and a faint flicker.
const HOLO_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform vec3 uEdge;
	uniform float uTime;
	uniform float uOpacity;
	uniform float uGlow;
	uniform vec2 uSize;
	varying vec2 vUv;
	void main() {
		vec2 px = vUv * uSize;
		float edge = min(min(px.x, uSize.x - px.x), min(px.y, uSize.y - px.y));
		float border = 1.0 - smoothstep(0.0, 0.04, edge);
		float halo = (1.0 - smoothstep(0.0, 0.35, edge)) * 0.35;
		float scan = 0.5 + 0.5 * sin(px.y * 42.0 - uTime * 3.0);
		float sweep = smoothstep(0.0, 0.25, 0.25 - abs(fract(vUv.y - uTime * 0.12) - 0.5) * 0.5);
		float flicker = 0.94 + 0.06 * sin(uTime * 23.0);
		vec3 col = uColor + uEdge * (border * 1.6 + halo + sweep * 0.25) * uGlow;
		float a = (uOpacity * (0.8 + 0.2 * scan) + border * 0.9 + halo * 0.4 + sweep * 0.12) * flicker;
		gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
	}
`;

/** A glass plane, `width` × `height`, with a glowing edge in `edge` colour. */
export function HoloPanel({ width, height, edge, glow = 1, opacity = 0.55, ...props }) {
	const t = usePalette();
	const mat = useRef(null);
	const uniforms = useMemo(
		() => ({
			uColor: { value: new THREE.Color() },
			uEdge: { value: new THREE.Color() },
			uTime: { value: 0 },
			uOpacity: { value: 0 },
			uGlow: { value: 0 },
			uSize: { value: new THREE.Vector2(width, height) },
		}),
		[width, height]
	);
	useFrame((state, delta) => {
		const m = mat.current;
		if (!m) return;
		m.uniforms.uTime.value = state.clock.elapsedTime;
		m.uniforms.uColor.value.set(t.panel);
		m.uniforms.uEdge.value.set(edge ?? t.blue);
		m.uniforms.uGlow.value = THREE.MathUtils.damp(m.uniforms.uGlow.value, glow, 6, delta);
		m.uniforms.uOpacity.value = THREE.MathUtils.damp(m.uniforms.uOpacity.value, opacity * (t.mode === "dark" ? 1 : 1.3), 6, delta);
	});
	return (
		<mesh {...props}>
			<planeGeometry args={[width, height]} />
			<shaderMaterial ref={mat} uniforms={uniforms} vertexShader={HOLO_VERT} fragmentShader={HOLO_FRAG} transparent depthWrite={false} />
		</mesh>
	);
}

/* ───────────────────────── Rings, gates, floor ───────────────────────── */

/** Concentric pedestal rings with tick marks, counter-rotating. */
export function HoloRings({ radius = 3, ...props }) {
	const t = usePalette();
	const a = useRef(null);
	const b = useRef(null);
	const ticks = useMemo(() => {
		const g = new THREE.BufferGeometry();
		const pts = [];
		for (let i = 0; i < 120; i += 1) {
			const ang = (i / 120) * Math.PI * 2;
			const len = i % 10 === 0 ? 0.28 : 0.12;
			pts.push(Math.cos(ang) * radius, 0, Math.sin(ang) * radius, Math.cos(ang) * (radius + len), 0, Math.sin(ang) * (radius + len));
		}
		g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
		return g;
	}, [radius]);
	useFrame((_, delta) => {
		if (a.current) a.current.rotation.y += delta * 0.15;
		if (b.current) b.current.rotation.y -= delta * 0.25;
	});
	return (
		<group {...props}>
			<group ref={a}>
				<mesh rotation-x={-Math.PI / 2}>
					<ringGeometry args={[radius - 0.02, radius + 0.02, 128]} />
					<meshBasicMaterial color={t.blue} toneMapped={false} transparent opacity={0.9} />
				</mesh>
				<lineSegments geometry={ticks}>
					<lineBasicMaterial color={t.blue} toneMapped={false} transparent opacity={0.7} />
				</lineSegments>
			</group>
			<group ref={b}>
				<mesh rotation-x={-Math.PI / 2}>
					<ringGeometry args={[radius * 0.72, radius * 0.72 + 0.05, 96, 1, 0, Math.PI * 1.4]} />
					<meshBasicMaterial color={t.amber} toneMapped={false} side={THREE.DoubleSide} />
				</mesh>
				<mesh rotation-x={-Math.PI / 2}>
					<ringGeometry args={[radius * 1.18, radius * 1.18 + 0.015, 128, 1, 0, Math.PI * 0.6]} />
					<meshBasicMaterial color={t.blueText} toneMapped={false} side={THREE.DoubleSide} />
				</mesh>
			</group>
			<mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
				<circleGeometry args={[radius, 64]} />
				<meshBasicMaterial color={t.blue} transparent opacity={t.mode === "dark" ? 0.08 : 0.1} depthWrite={false} />
			</mesh>
		</group>
	);
}

/** A ring gate the camera flies through between stations. */
export function Gate({ z, radius = 7.5 }) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame((state) => {
		if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 0.1;
	});
	return (
		<group position={[0, radius * 0.62, z]}>
			<group ref={ref}>
				<mesh>
					<torusGeometry args={[radius, 0.03, 8, 160]} />
					<meshBasicMaterial color={t.blue} toneMapped={false} />
				</mesh>
				{[0, 1, 2, 3].map((i) => (
					<mesh key={i} rotation-z={(i * Math.PI) / 2}>
						<torusGeometry args={[radius + 0.35, 0.06, 6, 40, Math.PI / 6]} />
						<meshBasicMaterial color={t.amber} toneMapped={false} />
					</mesh>
				))}
			</group>
		</group>
	);
}

const GRID_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform vec3 uAccent;
	uniform float uTime;
	varying vec2 vWorld;
	varying float vDepth;
	float line(vec2 p, float s, float w) {
		// +epsilon: the derivative can be 0 near the horizon, and the NaN it
		// makes would be smeared across the whole frame by the bloom pass.
		vec2 c = abs(fract(p / s - 0.5) - 0.5) / (fwidth(p / s) + 1e-5);
		return 1.0 - min(min(c.x, c.y) / w, 1.0);
	}
	void main() {
		float fine = line(vWorld, 1.0, 1.0);
		float major = line(vWorld, 5.0, 1.3);
		float pulse = smoothstep(0.96, 1.0, 1.0 - abs(fract(-vWorld.y * 0.015 - uTime * 0.08) - 0.5) * 2.0);
		float fade = 1.0 - smoothstep(14.0, 46.0, vDepth);
		vec3 col = mix(uColor, uAccent, pulse * major);
		float a = clamp((fine * 0.22 + major * (0.55 + pulse)) * fade, 0.0, 1.0);
		gl_FragColor = vec4(col, a);
	}
`;

/** Endless techy floor grid with a pulse running down the corridor. */
export function GridFloor() {
	const t = usePalette();
	const mat = useRef(null);
	const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color() }, uAccent: { value: new THREE.Color() }, uTime: { value: 0 } }), []);
	useFrame((state) => {
		const m = mat.current;
		if (!m) return;
		m.uniforms.uTime.value = state.clock.elapsedTime;
		m.uniforms.uColor.value.set(t.grid);
		m.uniforms.uAccent.value.set(t.amber);
	});
	return (
		<mesh rotation-x={-Math.PI / 2} position={[0, 0, -66]}>
			<planeGeometry args={[140, 260]} />
			<shaderMaterial
				ref={mat}
				uniforms={uniforms}
				transparent
				depthWrite={false}
				vertexShader={
					/* glsl */ `
					varying vec2 vWorld;
					varying float vDepth;
					void main() {
						vec4 w = modelMatrix * vec4(position, 1.0);
						vWorld = w.xz;
						vec4 mv = viewMatrix * w;
						vDepth = -mv.z;
						gl_Position = projectionMatrix * mv;
					}
				`
				}
				fragmentShader={GRID_FRAG}
			/>
		</mesh>
	);
}

/* ───────────────────────── Dust ───────────────────────── */

const DUST_VERT = /* glsl */ `
	uniform float uTime;
	uniform float uPixelRatio;
	attribute float aRand;
	varying float vAlpha;
	void main() {
		vec3 p = position;
		p.y += sin(uTime * (0.2 + aRand * 0.4) + aRand * 20.0) * 0.6;
		p.x += cos(uTime * (0.15 + aRand * 0.3) + aRand * 13.0) * 0.4;
		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		float depth = -mv.z;
		vAlpha = smoothstep(1.0, 4.0, depth) * (0.5 + 0.5 * sin(uTime * 2.0 + aRand * 40.0));
		gl_PointSize = min(60.0 * uPixelRatio / max(depth, 0.001), 6.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const DUST_FRAG = /* glsl */ `
	uniform vec3 uColor;
	varying float vAlpha;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		if (d > 0.5) discard;
		gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vAlpha * 0.8);
	}
`;

/**
 * Drifting motes along the corridor. Own shader rather than drei's Sparkles so
 * motes that drift up to the camera stay small and fade out instead of
 * becoming screen-sized sprites that blow the bloom pass out to white.
 */
const DUST_AREA = [30, 14, 160];
const DUST_CENTER = [0, 6, -66];
// Deterministic hash: render-pure, and the same motes on every visit.
const hash01 = (n) => {
	const x = Math.sin(n * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

export function Dust({ count, color, seed = 1 }) {
	const t = usePalette();
	const mat = useRef(null);
	const geometry = useMemo(() => {
		const pos = new Float32Array(count * 3);
		const rand = new Float32Array(count);
		for (let i = 0; i < count; i += 1) {
			const k = (i + 1) * 4 + seed * 7919;
			pos[i * 3] = DUST_CENTER[0] + (hash01(k) - 0.5) * DUST_AREA[0];
			pos[i * 3 + 1] = DUST_CENTER[1] + (hash01(k + 1) - 0.5) * DUST_AREA[1];
			pos[i * 3 + 2] = DUST_CENTER[2] + (hash01(k + 2) - 0.5) * DUST_AREA[2];
			rand[i] = hash01(k + 3);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
		return g;
	}, [count, seed]);
	const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } }), []);
	useFrame((state) => {
		const m = mat.current;
		if (!m) return;
		m.uniforms.uTime.value = state.clock.elapsedTime;
		m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
		m.uniforms.uColor.value.set(color ?? t.blue);
	});
	return (
		<points geometry={geometry} frustumCulled={false}>
			<shaderMaterial
				ref={mat}
				uniforms={uniforms}
				vertexShader={DUST_VERT}
				fragmentShader={DUST_FRAG}
				transparent
				depthWrite={false}
				blending={t.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
			/>
		</points>
	);
}
