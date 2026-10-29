"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

import { ThemeContext, usePalette } from "./theme";
import { KonarkScan } from "./KonarkScan";

// One night sky behind the whole page. Five chapters share the same spot in
// space and crossfade as you scroll: Konark inside a wireframe pavilion, a
// dotted globe of the sites, the most-wanted orbit, Konark half-built, and a
// ring of light to close.

export const CHAPTERS = 5;

const smooth = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** How present chapter i is at scroll progress p (0–1): 1 on it, 0 a chapter away. */
export const chapterWeight = (p, i) => 1 - smooth(0.2, 0.7, Math.abs(p * (CHAPTERS - 1) - i));

// Deterministic, so the sky is the same on every visit and render stays pure.
const hash01 = (n) => {
	const x = Math.sin(n * 12.9898) * 43758.5453;
	return x - Math.floor(x);
};

/* ───────────────────────── Shared point shader ───────────────────────── */

const POINT_VERT = /* glsl */ `
	uniform float uTime;
	uniform float uPixelRatio;
	uniform float uScale;
	attribute float aSize;
	attribute float aRand;
	varying float vAlpha;
	void main() {
		vec4 mv = modelViewMatrix * vec4(position, 1.0);
		float depth = max(-mv.z, 0.001);
		vAlpha = 0.6 + 0.4 * sin(uTime * (0.4 + aRand * 1.4) + aRand * 40.0);
		gl_PointSize = min(aSize * uScale * uPixelRatio / depth, 48.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const POINT_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform float uOpacity;
	uniform float uSoft;
	varying float vAlpha;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		if (d > 0.5) discard;
		float core = 1.0 - smoothstep(mix(0.3, 0.0, uSoft), 0.5, d);
		gl_FragColor = vec4(uColor, core * vAlpha * uOpacity);
	}
`;

/** Points with per-point size and twinkle; `fade` (getter, 0–1) sets their opacity. */
function Dots({ positions, sizes, scale = 260, soft = 0.4, color, fade, twinkle = true, ...props }) {
	const t = usePalette();
	const mat = useRef(null);
	const geometry = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
		const rand = new Float32Array(sizes.length);
		for (let i = 0; i < rand.length; i += 1) rand[i] = twinkle ? hash01(i + 7) : 0;
		g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
		return g;
	}, [positions, sizes, twinkle]);
	const [uniforms] = useState(() => ({
		uTime: { value: 0 },
		uPixelRatio: { value: 1 },
		uScale: { value: scale },
		uColor: { value: new THREE.Color() },
		uOpacity: { value: 0 },
		uSoft: { value: soft },
	}));
	useFrame((state) => {
		const m = mat.current;
		if (!m) return;
		m.uniforms.uTime.value = twinkle ? state.clock.elapsedTime : 0;
		m.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
		m.uniforms.uColor.value.set(color ?? t.ink);
		m.uniforms.uOpacity.value = fade ? fade() : 1;
	});
	return (
		<points geometry={geometry} frustumCulled={false} {...props}>
			<shaderMaterial
				ref={mat}
				uniforms={uniforms}
				vertexShader={POINT_VERT}
				fragmentShader={POINT_FRAG}
				transparent
				depthWrite={false}
				blending={t.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
			/>
		</points>
	);
}

/** Thin lines; `fade` (getter, 0–1) sets their opacity. */
function Lines({ geometry, fade, opacity = 0.35, color, ...props }) {
	const t = usePalette();
	const mat = useRef(null);
	useFrame(() => {
		const m = mat.current;
		if (!m) return;
		m.opacity = opacity * (fade ? fade() : 1);
		m.color.set(color ?? t.ink);
		m.visible = m.opacity > 0.002;
	});
	return (
		<lineSegments geometry={geometry} {...props}>
			<lineBasicMaterial ref={mat} transparent depthWrite={false} toneMapped={false} />
		</lineSegments>
	);
}

/* ───────────────────────── The sky ───────────────────────── */

function Stars({ intro }) {
	const { positions, sizes } = useMemo(() => {
		const n = 1600;
		const positions = new Float32Array(n * 3);
		const sizes = new Float32Array(n);
		for (let i = 0; i < n; i += 1) {
			const th = hash01(i * 3 + 1) * Math.PI * 2;
			const ph = Math.acos(2 * hash01(i * 3 + 2) - 1);
			const r = 14 + hash01(i * 3 + 3) * 40;
			positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
			positions[i * 3 + 1] = r * Math.cos(ph);
			positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 10;
			// Mostly pinpricks, a few soft out-of-focus orbs.
			sizes[i] = hash01(i + 900) > 0.97 ? 0.9 + hash01(i + 1300) * 1.6 : 0.12 + Math.pow(hash01(i + 500), 3) * 0.5;
		}
		return { positions, sizes };
	}, []);
	const group = useRef(null);
	useFrame((state, delta) => {
		if (group.current) group.current.rotation.y += delta * 0.006;
	});
	return (
		<group ref={group}>
			<Dots positions={positions} sizes={sizes} scale={420} soft={1} fade={() => 0.25 + 0.75 * intro.get()} />
		</group>
	);
}

/* ───────────────────────── I · Pavilion ───────────────────────── */

function pavilionGeometry() {
	const R = 3.4;
	const H = 3.0;
	const pts = [];
	const ring = (y, r, seg = 128) => {
		for (let i = 0; i < seg; i += 1) {
			const a = (i / seg) * Math.PI * 2;
			const b = ((i + 1) / seg) * Math.PI * 2;
			pts.push(Math.cos(a) * r, y, Math.sin(a) * r, Math.cos(b) * r, y, Math.sin(b) * r);
		}
	};
	ring(H / 2, R);
	ring(-H / 2, R);
	ring(H / 2 + 0.25, R * 0.8);
	ring(-H / 2 - 0.25, R * 0.8);
	// Pillars, and window frames on three tiers.
	for (let i = 0; i < 24; i += 1) {
		const a = (i / 24) * Math.PI * 2;
		pts.push(Math.cos(a) * R, -H / 2, Math.sin(a) * R, Math.cos(a) * R, H / 2, Math.sin(a) * R);
	}
	for (let tier = 0; tier < 3; tier += 1) {
		for (let i = 0; i < 18; i += 1) {
			if (hash01(i * 7 + tier * 31) < 0.25) continue;
			const a = ((i + 0.5 + (tier % 2) * 0.3) / 18) * Math.PI * 2;
			const w = 0.16 + hash01(i + tier * 50) * 0.12;
			const h = 0.5 + hash01(i * 3 + tier) * 0.35;
			const y = -H / 2 + 0.35 + tier * 1.05 + hash01(i * 11 + tier) * 0.15;
			const c = [Math.cos(a) * R, Math.sin(a) * R];
			const tx = -Math.sin(a) * w;
			const tz = Math.cos(a) * w;
			const corner = [
				[c[0] - tx, y, c[1] - tz],
				[c[0] + tx, y, c[1] + tz],
				[c[0] + tx, y + h, c[1] + tz],
				[c[0] - tx, y + h, c[1] - tz],
			];
			for (let k = 0; k < 4; k += 1) pts.push(...corner[k], ...corner[(k + 1) % 4]);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
	return g;
}

/* ───────────────────────── II · Globe ───────────────────────── */

function globePoints(n = 2400, r = 1.7) {
	const positions = new Float32Array(n * 3);
	const sizes = new Float32Array(n);
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < n; i += 1) {
		const y = 1 - (i / (n - 1)) * 2;
		const rad = Math.sqrt(1 - y * y);
		const a = golden * i;
		positions[i * 3] = Math.cos(a) * rad * r;
		positions[i * 3 + 1] = y * r;
		positions[i * 3 + 2] = Math.sin(a) * rad * r;
		sizes[i] = 0.12;
	}
	return { positions, sizes };
}

/* ───────────────────────── III · Orbit ───────────────────────── */

const ORBIT_R = 2.35;

function Orbit({ ranked, max, fade, onPick, labels }) {
	const t = usePalette();
	const angleOf = (i) => Math.PI / 2 - (i / ranked.length) * Math.PI * 2;
	const ringGeo = useMemo(() => {
		const pts = [];
		const seg = 200;
		for (let i = 0; i < seg; i += 1) {
			const a = (i / seg) * Math.PI * 2;
			const b = ((i + 1) / seg) * Math.PI * 2;
			pts.push(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0, Math.cos(b) * ORBIT_R, Math.sin(b) * ORBIT_R, 0);
		}
		for (let i = 0; i < 72; i += 1) {
			const a = (i / 72) * Math.PI * 2;
			const r2 = ORBIT_R + (i % 6 === 0 ? 0.22 : 0.1);
			pts.push(Math.cos(a) * (ORBIT_R + 0.04), Math.sin(a) * (ORBIT_R + 0.04), 0, Math.cos(a) * r2, Math.sin(a) * r2, 0);
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
		return g;
	}, []);
	const { positions, sizes } = useMemo(() => {
		const positions = new Float32Array(ranked.length * 3);
		const sizes = new Float32Array(ranked.length);
		ranked.forEach((r, i) => {
			const a = Math.PI / 2 - (i / ranked.length) * Math.PI * 2;
			positions[i * 3] = Math.cos(a) * ORBIT_R;
			positions[i * 3 + 1] = Math.sin(a) * ORBIT_R;
			sizes[i] = 0.9 + 3.2 * (max > 0 ? r.n / max : 0);
		});
		return { positions, sizes };
	}, [ranked, max]);
	// The needle points at the leader (always at the top).
	const needleGeo = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, ORBIT_R, 0], 3));
		return g;
	}, []);
	const group = useRef(null);
	const labelEls = useRef([]);
	// Names beside the lights only where there is room for them.
	const wide = useThree((s) => s.size.width >= 700);
	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		const f = fade();
		g.rotation.x = 0.35 + state.pointer.y * 0.05;
		g.rotation.y = state.pointer.x * 0.08;
		g.visible = f > 0.01;
		for (const el of labelEls.current) if (el) el.style.opacity = String(f);
	});
	return (
		<group ref={group}>
			<Lines geometry={ringGeo} fade={fade} opacity={0.45} color={t.accent} />
			<Lines geometry={needleGeo} fade={fade} opacity={0.7} />
			<Dots positions={positions} sizes={sizes} scale={300} soft={0.9} color={t.glow} fade={fade} />
			{ranked.map((r, i) => {
				const a = angleOf(i);
				return (
					<mesh
						key={r.site.slug}
						position={[Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0]}
						visible={false}
						onClick={(e) => {
							if (fade() < 0.6) return;
							e.stopPropagation();
							onPick(r.site.slug);
						}}
						onPointerOver={() => {
							if (fade() > 0.6) document.body.style.cursor = "pointer";
						}}
						onPointerOut={() => {
							document.body.style.cursor = "";
						}}>
						<sphereGeometry args={[0.32, 8, 8]} />
					</mesh>
				);
			})}
			{labels &&
				wide &&
				max > 0 &&
				ranked.slice(0, 3).map((r, i) => {
					const a = angleOf(i);
					return (
						<Html key={r.site.slug} position={[Math.cos(a) * (ORBIT_R + 0.55), Math.sin(a) * (ORBIT_R + 0.55), 0]} center zIndexRange={[15, 10]}>
							<span
								ref={(el) => {
									labelEls.current[i] = el;
								}}
								className="pa-caps pointer-events-none whitespace-nowrap text-(--pa-text)"
								style={{ opacity: 0 }}>
								{r.site.name} · {r.n}
							</span>
						</Html>
					);
				})}
		</group>
	);
}

/* ───────────────────────── V · Ring of light ───────────────────────── */

function ringPoints(n = 2600) {
	const positions = new Float32Array(n * 3);
	const sizes = new Float32Array(n);
	for (let i = 0; i < n; i += 1) {
		const a = hash01(i + 3) * Math.PI * 2;
		// Gaussian-ish spread across the band, denser at its middle.
		const g = (hash01(i + 11) + hash01(i + 19) + hash01(i + 23) - 1.5) * 0.45;
		const r = 3.4 + g;
		positions[i * 3] = Math.cos(a) * r * 1.3;
		positions[i * 3 + 1] = Math.sin(a) * r;
		positions[i * 3 + 2] = (hash01(i + 29) - 0.5) * 0.6;
		sizes[i] = 0.08 + Math.pow(hash01(i + 41), 4) * 0.35;
	}
	return { positions, sizes };
}

/* ───────────────────────── Scene ───────────────────────── */

const CAMERA_Z = [10.5, 10.5, 10.5, 9.5, 10.2];

function Rig({ progress }) {
	useFrame((state, delta) => {
		const { camera, size } = state;
		const p = progress.get() * (CHAPTERS - 1);
		const i = Math.min(CHAPTERS - 2, Math.floor(p));
		const k = smooth(0, 1, p - i);
		// Narrow screens step back so the pieces keep their width.
		const aspect = size.width / size.height;
		const fit = aspect < 1 ? Math.min(1.9, 1 / aspect) : 1;
		const z = THREE.MathUtils.lerp(CAMERA_Z[i], CAMERA_Z[i + 1], k) * fit;
		camera.position.x = THREE.MathUtils.damp(camera.position.x, state.pointer.x * 0.35, 2, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, state.pointer.y * 0.2, 2, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 3, delta);
		camera.lookAt(0, 0, 0);
	});
	return null;
}

function Scene({ progress, intro, ranked, max, onPick }) {
	const t = usePalette();
	const w = (i) => () => chapterWeight(progress.get(), i) * intro.get();
	const pavilion = useMemo(() => pavilionGeometry(), []);
	const globe = useMemo(() => globePoints(), []);
	const ring = useMemo(() => ringPoints(), []);
	const turn = useRef(null);
	const globeRef = useRef(null);
	const ringRef = useRef(null);
	useFrame((state, delta) => {
		if (turn.current) turn.current.rotation.y += delta * 0.05;
		if (globeRef.current) globeRef.current.rotation.y += delta * 0.08;
		if (ringRef.current) ringRef.current.rotation.z += delta * 0.02;
	});
	// Konark stands whole in chapter I and half-built, waiting, in chapter IV.
	const templeFade = { get: () => Math.max(chapterWeight(progress.get(), 0), chapterWeight(progress.get(), 3) * 0.45) * intro.get() };
	const templeBuild = {
		get: () => intro.get() * (chapterWeight(progress.get(), 0) + chapterWeight(progress.get(), 3) * 0.55 + chapterWeight(progress.get(), 1) * 0.3),
	};
	return (
		<>
			<color attach="background" args={[t.bg]} />
			<Rig progress={progress} />
			<Stars intro={intro} />
			<group ref={turn} position-y={-0.2}>
				<Lines geometry={pavilion} fade={w(0)} opacity={t.mode === "dark" ? 0.32 : 0.4} />
				<KonarkScan assemble={templeBuild} build={templeBuild} fade={templeFade} scale={2.3} size={20} />
			</group>
			<group ref={globeRef} position-y={0.5}>
				<Dots positions={globe.positions} sizes={globe.sizes} scale={300} soft={0.3} twinkle={false} fade={w(1)} />
			</group>
			<group position-y={-0.2}>
				<Orbit ranked={ranked} max={max} fade={w(2)} onPick={onPick} labels />
			</group>
			<group ref={ringRef}>
				<Dots positions={ring.positions} sizes={ring.sizes} scale={320} soft={0.8} fade={w(4)} />
			</group>
		</>
	);
}

export default function AtelierScene({ palette, ...props }) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			camera={{ position: [0, 0, 10.5], fov: 35, near: 0.1, far: 200 }}
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
