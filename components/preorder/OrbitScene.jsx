"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

import { ThemeContext, usePalette } from "./theme";
import { KonarkScan } from "./KonarkScan";

// One model, one camera. Konark stands at the centre of a fixed full-screen
// canvas, and scrolling flies the camera round it: a new angle for each
// chapter, with the model set to one side so the words have room.

export const CHAPTERS = 5;

const smooth = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** How present chapter i is at scroll progress p (0–1): 1 on it, 0 a chapter away. */
export const chapterWeight = (p, i) => 1 - smooth(0.2, 0.7, Math.abs(p * (CHAPTERS - 1) - i));

// Camera per chapter: azimuth and elevation round the temple (radians),
// distance, and how far to slide the model sideways / down on screen.
const SHOTS = [
	{ az: -0.55, el: 0.16, dist: 9, x: 2.3, y: 0 }, // hero: model right of the headline
	{ az: 0.95, el: 0.05, dist: 8, x: -2.3, y: 0 }, // close and low, from the side
	{ az: 2.3, el: 0.85, dist: 9, x: -2.4, y: 0 }, // from above, beside the board
	{ az: 3.55, el: 0.16, dist: 8.6, x: 0, y: -1.45 }, // behind, above the call to pre-order
	{ az: 5.0, el: 0.32, dist: 11, x: 2.6, y: 0 }, // pulled back, beside the app
];

const lerp = THREE.MathUtils.lerp;
const target = new THREE.Vector3();
const right = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function Rig({ progress, intro }) {
	useFrame((state, delta) => {
		const { camera, size, pointer } = state;
		const p = progress.get() * (CHAPTERS - 1);
		const i = Math.min(CHAPTERS - 2, Math.floor(p));
		const k = smooth(0, 1, p - i);
		const a = SHOTS[i];
		const b = SHOTS[i + 1];
		// Phones: the model sits centred and high, the words below it.
		const narrow = size.width / size.height < 0.9;
		const az = lerp(a.az, b.az, k) + pointer.x * 0.08;
		const el = lerp(a.el, b.el, k) + pointer.y * 0.04;
		const dist = lerp(a.dist, b.dist, k) * (narrow ? 1.55 : 1) + (1 - intro.get()) * 8;
		const sx = narrow ? 0 : lerp(a.x, b.x, k);
		const sy = narrow ? -1.5 : lerp(a.y, b.y, k);

		const cx = Math.sin(az) * Math.cos(el) * dist;
		const cy = Math.sin(el) * dist + 0.4;
		const cz = Math.cos(az) * Math.cos(el) * dist;
		const damp = 3.2;
		camera.position.x = THREE.MathUtils.damp(camera.position.x, cx, damp, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, cy, damp, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, cz, damp, delta);
		// Look past the model so it lands to one side of the frame.
		right.set(Math.cos(az), 0, -Math.sin(az));
		target.set(0, 0.2, 0).addScaledVector(right, -sx).addScaledVector(up, sy);
		camera.lookAt(target);
	});
	return null;
}

/** A soft pool of light under the model, and two fine turntable rings. */
function Ground() {
	const t = usePalette();
	const mat = useRef(null);
	const rings = useMemo(() => {
		const pts = [];
		const ring = (r, seg = 160) => {
			for (let i = 0; i < seg; i += 1) {
				const a = (i / seg) * Math.PI * 2;
				const b = ((i + 1) / seg) * Math.PI * 2;
				pts.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r);
			}
		};
		ring(2.5);
		ring(3.1);
		for (let i = 0; i < 96; i += 1) {
			const a = (i / 96) * Math.PI * 2;
			const r2 = 3.1 + (i % 8 === 0 ? 0.22 : 0.1);
			pts.push(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1, Math.cos(a) * r2, 0, Math.sin(a) * r2);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
		return g;
	}, []);
	const [uniforms] = useState(() => ({ uColor: { value: new THREE.Color() }, uStrength: { value: 0 } }));
	const spin = useRef(null);
	useFrame((_, delta) => {
		if (spin.current) spin.current.rotation.y += delta * 0.04;
		const m = mat.current;
		if (!m) return;
		m.uniforms.uColor.value.set(t.accent);
		m.uniforms.uStrength.value = t.mode === "dark" ? 0.32 : 0.14;
	});
	return (
		<group position-y={-1.3}>
			<mesh rotation-x={-Math.PI / 2}>
				<circleGeometry args={[5, 64]} />
				<shaderMaterial
					ref={mat}
					uniforms={uniforms}
					transparent
					depthWrite={false}
					vertexShader={/* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
					fragmentShader={/* glsl */ `
						uniform vec3 uColor;
						uniform float uStrength;
						varying vec2 vUv;
						void main() {
							float d = length(vUv - 0.5) * 2.0;
							gl_FragColor = vec4(uColor, pow(1.0 - clamp(d, 0.0, 1.0), 2.4) * uStrength);
						}
					`}
				/>
			</mesh>
			<lineSegments ref={spin} geometry={rings}>
				<lineBasicMaterial color={t.line} transparent opacity={t.mode === "dark" ? 0.16 : 0.22} depthWrite={false} />
			</lineSegments>
		</group>
	);
}

const MOTE_VERT = /* glsl */ `
	uniform float uPixelRatio;
	varying float vAlpha;
	void main() {
		vec4 mv = modelViewMatrix * vec4(position, 1.0);
		float depth = max(-mv.z, 0.001);
		// Round, capped in size, and faded out near the lens: a mote drifting
		// past the camera never becomes a big square on screen.
		vAlpha = smoothstep(2.0, 5.0, depth);
		gl_PointSize = min(40.0 * uPixelRatio / depth, 3.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const MOTE_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform float uOpacity;
	varying float vAlpha;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		if (d > 0.5) discard;
		gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vAlpha * uOpacity);
	}
`;

/** A few slow motes of light around the model. */
function Motes() {
	const t = usePalette();
	const ref = useRef(null);
	const mat = useRef(null);
	const geometry = useMemo(() => {
		const n = 220;
		const pos = new Float32Array(n * 3);
		for (let i = 0; i < n; i += 1) {
			const h = (k) => {
				const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
				return x - Math.floor(x);
			};
			const a = h(1) * Math.PI * 2;
			const r = 2.5 + h(2) * 8;
			pos[i * 3] = Math.cos(a) * r;
			pos[i * 3 + 1] = -1.3 + h(3) * 6;
			pos[i * 3 + 2] = Math.sin(a) * r;
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		return g;
	}, []);
	const [uniforms] = useState(() => ({ uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } }));
	useFrame((state, delta) => {
		if (ref.current) ref.current.rotation.y -= delta * 0.015;
		const m = mat.current;
		if (!m) return;
		m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
		m.uniforms.uColor.value.set(t.mode === "dark" ? "#ffffff" : t.accent);
		m.uniforms.uOpacity.value = t.mode === "dark" ? 0.55 : 0.45;
	});
	return (
		<points ref={ref} geometry={geometry} frustumCulled={false}>
			<shaderMaterial ref={mat} uniforms={uniforms} vertexShader={MOTE_VERT} fragmentShader={MOTE_FRAG} transparent depthWrite={false} />
		</points>
	);
}

function Scene({ progress, intro }) {
	const t = usePalette();
	// The temple is laid course by course as the page opens, then stays whole.
	const built = { get: () => intro.get() };
	return (
		<>
			<color attach="background" args={[t.bg]} />
			<Rig progress={progress} intro={intro} />
			<Ground />
			<Motes />
			<KonarkScan assemble={built} build={built} interactive scale={1.9} size={15} position-y={-0.05} />
		</>
	);
}

export default function OrbitScene({ palette, ...props }) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			camera={{ position: [0, 3, 18], fov: 35, near: 0.1, far: 200 }}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			style={{ position: "fixed", inset: 0, zIndex: 0 }}>
			<ThemeContext.Provider value={palette}>
				<Suspense fallback={null}>
					<Scene {...props} />
				</Suspense>
			</ThemeContext.Provider>
		</Canvas>
	);
}
