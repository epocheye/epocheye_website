"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// The space the cloud floats in: out-of-focus motes drifting at every depth
// (sharp near the shape, wide soft discs close to the lens), and far behind,
// a faint lattice of lines fading into the fog. Both rise past as you scroll
// down, the far ones slower, so the page feels like a descent.

const SPAN = 44;

const hash = (n) => {
	const x = Math.sin(n * 78.233) * 43758.5453;
	return x - Math.floor(x);
};

const MOTE_VERT = /* glsl */ `
	uniform float uTime;
	uniform float uTravel;
	uniform float uPixelRatio;
	attribute float aRand;
	varying float vAlpha;
	varying float vBlur;
	varying float vLime;
	void main() {
		vec3 p = position;
		float rise = uTravel * (0.35 + 0.65 * aRand) + uTime * 0.06 * (0.4 + aRand);
		p.y = mod(p.y + rise + ${SPAN / 2}.0, ${SPAN}.0) - ${SPAN / 2}.0;
		p.x += sin(uTime * 0.15 + aRand * 20.0) * 0.4;
		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		float depth = -mv.z;
		// In focus at the shape's distance; blurrier toward the lens and the far fog.
		float blur = clamp(abs(depth - 13.0) / 9.0, 0.0, 1.0);
		vBlur = blur;
		vLime = step(0.93, aRand);
		gl_PointSize = (1.5 + blur * blur * 44.0) * uPixelRatio * (13.0 / max(depth, 1.0));
		vAlpha = mix(0.55, 0.07, blur) * smoothstep(1.5, 4.0, depth) * (1.0 - smoothstep(30.0, 42.0, depth));
		gl_Position = projectionMatrix * mv;
	}
`;
const MOTE_FRAG = /* glsl */ `
	varying float vAlpha;
	varying float vBlur;
	varying float vLime;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		float soft = mix(0.08, 0.42, vBlur);
		float a = 1.0 - smoothstep(0.5 - soft, 0.5, d);
		if (a <= 0.0) discard;
		vec3 col = mix(vec3(0.62, 0.71, 0.86), vec3(0.8, 1.0, 0.0), vLime * 0.8);
		gl_FragColor = vec4(col, a * vAlpha);
	}
`;

function Motes({ count, track }) {
	const mat = useRef(null);
	const geometry = useMemo(() => {
		const pos = new Float32Array(count * 3);
		const rand = new Float32Array(count);
		for (let i = 0; i < count; i += 1) {
			pos[i * 3] = (hash(i + 1) - 0.5) * 34;
			pos[i * 3 + 1] = (hash(i + 2) - 0.5) * SPAN;
			pos[i * 3 + 2] = 7 - hash(i + 3) * 36;
			rand[i] = hash(i + 4);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
		return g;
	}, [count]);
	const uniforms = useMemo(() => ({ uTime: { value: 0 }, uTravel: { value: 0 }, uPixelRatio: { value: 1 } }), []);
	useFrame((state) => {
		const u = mat.current?.uniforms;
		if (!u) return;
		u.uTime.value = state.clock.elapsedTime;
		u.uTravel.value = THREE.MathUtils.lerp(u.uTravel.value, (track.f + 1) * 3.2, 0.08);
		u.uPixelRatio.value = state.gl.getPixelRatio();
	});
	return (
		<points geometry={geometry} frustumCulled={false} renderOrder={1}>
			<shaderMaterial ref={mat} uniforms={uniforms} vertexShader={MOTE_VERT} fragmentShader={MOTE_FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
		</points>
	);
}

/** Far behind everything: nodes joined to their nearest neighbours, fading into the fog. */
function Lattice({ track }) {
	const ref = useRef(null);
	const geometry = useMemo(() => {
		const nodes = Array.from({ length: 170 }, (_, i) => [(hash(i + 11) - 0.5) * 90, (hash(i + 12) - 0.5) * 150, -20 - hash(i + 13) * 34]);
		const pts = [];
		nodes.forEach((a, i) => {
			nodes
				.map((b, k) => [k, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2])
				.filter(([k]) => k > i)
				.sort((x, y) => x[1] - y[1])
				.slice(0, 2)
				.forEach(([k]) => pts.push(...a, ...nodes[k]));
		});
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
		return g;
	}, []);
	useFrame((state, delta) => {
		const g = ref.current;
		if (!g) return;
		g.position.y = THREE.MathUtils.damp(g.position.y, (track.f + 1) * 1.6 - 8, 3, delta);
		g.rotation.y = Math.sin(state.clock.elapsedTime * 0.04) * 0.15 + state.pointer.x * 0.05;
	});
	return (
		<lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
			<lineBasicMaterial color="#8ea4cc" transparent opacity={0.22} depthWrite={false} />
		</lineSegments>
	);
}

export default function Atmosphere({ track, small }) {
	return (
		<>
			<fog attach="fog" args={["#070a11", 16, 52]} />
			<Lattice track={track} />
			<Motes count={small ? 160 : 300} track={track} />
		</>
	);
}
