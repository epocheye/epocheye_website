"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, PerspectiveCamera, RoundedBox, View, useTexture } from "@react-three/drei";

import { ThemeContext, usePalette } from "./theme";
import { KonarkScan } from "./KonarkScan";

// The page is ordinary DOM; 3D appears only in a few boxes (the phone, the
// bar chart). One fixed, click-through canvas draws every drei <View> into its
// own box, so the page keeps crisp type and native scrolling.

const smooth = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};

/** The one WebGL canvas. Sits above section backgrounds; only the view boxes draw. */
export function Canvas3D({ eventSource, palette }) {
	return (
		<Canvas
			eventSource={eventSource}
			eventPrefix="client"
			dpr={[1, 1.75]}
			gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
			style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 20 }}>
			<ThemeContext.Provider value={palette}>
				<View.Port />
			</ThemeContext.Provider>
		</Canvas>
	);
}

/** Studio light: soft panels for the phone's metal and glass to catch, no network HDR. */
function Studio() {
	const t = usePalette();
	return (
		<>
			<ambientLight intensity={t.mode === "light" ? 0.7 : 0.6} />
			<directionalLight position={[3, 6, 5]} intensity={t.mode === "light" ? 1.6 : 1.5} />
			{/* Rim light from behind, so dark hardware still reads against a dark page. */}
			<directionalLight position={[-4, 3, -6]} intensity={t.mode === "light" ? 0.6 : 2.2} color={t.accent} />
			<Environment resolution={128}>
				<Lightformer form="rect" intensity={2.2} position={[0, 4, 5]} scale={[8, 2, 1]} />
				<Lightformer form="rect" intensity={1.2} position={[-5, 0, 3]} rotation-y={Math.PI / 2.5} scale={[2, 8, 1]} />
				<Lightformer form="rect" intensity={1.6} color={t.accent} position={[5, -1, 2]} rotation-y={-Math.PI / 2.5} scale={[2, 5, 1]} />
			</Environment>
		</>
	);
}

/* ───────────────────────── Phone ───────────────────────── */

const SCREEN_FRAG = /* glsl */ `
	uniform float uTime;
	uniform float uAR;
	uniform vec3 uAccent;
	uniform sampler2D uLogo;
	varying vec2 vUv;
	void main() {
		vec2 uv = vUv;
		// A dim "camera feed": a dusk gradient with slow, soft shapes.
		vec3 col = mix(vec3(0.035, 0.045, 0.08), vec3(0.09, 0.11, 0.18), uv.y);
		col += 0.06 * exp(-length((uv - vec2(0.3, 0.32 + 0.02 * sin(uTime * 0.6))) * vec2(1.0, 0.6)) * 6.0);
		col += 0.05 * exp(-length((uv - vec2(0.72, 0.6)) * vec2(1.0, 0.7)) * 7.0) * vec3(0.6, 0.7, 1.0);
		// Splash: the Epocheye mark, fading out as AR comes on.
		vec2 lu = (uv - 0.5) * vec2(1.0, 2.145) / 0.34 + 0.5;
		if (lu.x > 0.0 && lu.x < 1.0 && lu.y > 0.0 && lu.y < 1.0) {
			vec4 logo = texture2D(uLogo, lu);
			col = mix(col, vec3(0.96), logo.a * (1.0 - uAR) * 0.9);
		}
		// AR: corner brackets and a scan line, in the accent.
		vec2 d = abs(uv - 0.5);
		float hx = step(0.33, d.x) * step(d.x, 0.345) * step(0.36, d.y) * step(d.y, 0.44);
		float hy = step(0.425, d.y) * step(d.y, 0.44) * step(0.25, d.x) * step(d.x, 0.345);
		float scan = smoothstep(0.012, 0.0, abs(uv.y - fract(uTime * 0.22))) * 0.6;
		col = mix(col, uAccent, clamp((max(hx, hy) + scan) * uAR, 0.0, 1.0));
		gl_FragColor = vec4(col, 1.0);
	}
`;

/** A slim phone, modelled: rounded body, glass screen with a live shader, island, camera bump. */
function Phone({ ar, ...props }) {
	const t = usePalette();
	const logo = useTexture("/logo-white.png");
	const mat = useRef(null);
	const [uniforms] = useState(() => ({
		uTime: { value: 0 },
		uAR: { value: 0 },
		uAccent: { value: new THREE.Color() },
		uLogo: { value: null },
	}));
	useFrame((state) => {
		const m = mat.current;
		if (!m) return;
		m.uniforms.uTime.value = state.clock.elapsedTime;
		m.uniforms.uAR.value = ar ? ar() : 0;
		m.uniforms.uAccent.value.set(t.accent);
		m.uniforms.uLogo.value = logo;
	});
	const metal = <meshPhysicalMaterial color={t.phone} metalness={0.75} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />;
	return (
		<group {...props}>
			<RoundedBox args={[1.5, 3.08, 0.16]} radius={0.075} smoothness={6} bevelSegments={6}>
				{metal}
			</RoundedBox>
			{/* Bezel and screen */}
			<RoundedBox args={[1.44, 3.02, 0.01]} radius={0.004} position-z={0.081}>
				<meshStandardMaterial color="#050506" roughness={0.2} />
			</RoundedBox>
			<mesh position-z={0.0875}>
				<planeGeometry args={[1.36, 2.92]} />
				<shaderMaterial
					ref={mat}
					uniforms={uniforms}
					vertexShader={/* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
					fragmentShader={SCREEN_FRAG}
					toneMapped={false}
				/>
			</mesh>
			{/* Dynamic island */}
			<RoundedBox args={[0.42, 0.12, 0.01]} radius={0.004} position={[0, 1.3, 0.093]}>
				<meshBasicMaterial color="#000000" />
			</RoundedBox>
			{/* Camera bump on the back */}
			<group position={[-0.36, 1.06, -0.1]}>
				<RoundedBox args={[0.6, 0.6, 0.05]} radius={0.02}>
					{metal}
				</RoundedBox>
				{[
					[-0.13, 0.13],
					[0.13, -0.13],
					[-0.13, -0.13],
				].map(([x, y], i) => (
					<mesh key={i} position={[x, y, -0.04]} rotation-x={Math.PI / 2}>
						<cylinderGeometry args={[0.1, 0.1, 0.05, 32]} />
						<meshPhysicalMaterial color="#0a0a0c" metalness={0.4} roughness={0.1} clearcoat={1} />
					</mesh>
				))}
			</group>
			{/* Side buttons */}
			<mesh position={[0.765, 0.65, 0]}>
				<boxGeometry args={[0.03, 0.42, 0.06]} />
				{metal}
			</mesh>
			<mesh position={[-0.765, 0.8, 0]}>
				<boxGeometry args={[0.03, 0.22, 0.06]} />
				{metal}
			</mesh>
		</group>
	);
}

/* ───────────────────────── Story phone (hero) ───────────────────────── */

/**
 * The hero's phone, driven by the story section's scroll (`story.value`, 0–1):
 * it turns to face you, then Konark rises out of the screen in AR and the
 * phone comes round to show it from the side.
 */
function StoryPhone({ story, portrait }) {
	const t = usePalette();
	const rig = useRef(null);
	const temple = useRef(null);
	const beam = useRef(null);
	const p = () => story.value;
	const ar = () => smooth(0.2, 0.5, p());
	const assemble = { get: () => smooth(0.26, 0.62, p()) };
	useFrame((state) => {
		const g = rig.current;
		if (!g) return;
		const v = p();
		const time = state.clock.elapsedTime;
		g.rotation.y = -0.6 + 0.6 * smooth(0, 0.42, v) - 0.55 * smooth(0.68, 1, v) + state.pointer.x * 0.12;
		g.rotation.x = 0.1 - 0.2 * smooth(0.15, 0.5, v) - state.pointer.y * 0.06;
		g.position.y = Math.sin(time * 1.1) * 0.05 - 0.75 * smooth(0.22, 0.52, v);
		const a = ar();
		if (temple.current) temple.current.visible = a > 0.01;
		if (beam.current) {
			beam.current.material.opacity = (t.mode === "light" ? 0.05 : 0.09) * a;
			beam.current.scale.y = Math.max(0.001, a);
		}
	});
	return (
		<group scale={0.84} position-y={portrait ? -0.05 : -0.15}>
			<group ref={rig}>
				<Phone ar={ar} />
				{/* Projection from the screen up to the model */}
				<mesh ref={beam} position={[0, 1.95, 0.25]}>
					<cylinderGeometry args={[1.25, 0.55, 0.9, 48, 1, true]} />
					<meshBasicMaterial color={t.accent} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
				</mesh>
				<group ref={temple} position={[0, 2.62, 0.25]}>
					<KonarkScan assemble={assemble} build={assemble} spread={0.18} source={-0.75} scale={1.2} size={portrait ? 15 : 18} />
				</group>
			</group>
		</group>
	);
}

export function PhoneStage({ story, portrait }) {
	const t = usePalette();
	return (
		<View className="absolute inset-0">
			<PerspectiveCamera makeDefault position={[0, 0.45, 11]} fov={30} />
			<Studio />
			<Suspense fallback={null}>
				<StoryPhone story={story} portrait={portrait} />
			</Suspense>
			<ContactShadows position={[0, -2.35, 0]} opacity={t.shadow} scale={7} blur={2.8} far={3.5} />
		</View>
	);
}

/* ───────────────────────── Most-wanted bars ───────────────────────── */

const BAR_MAX = 3.3;
const BAR_MIN = 0.06;

function Bars({ ranked, max, hovered, onHover, onPick, grow, portrait }) {
	const t = usePalette();
	const group = useRef(null);
	const bars = useRef([]);
	const heights = useRef([]);
	const gap = portrait ? 0.42 : 0.5;
	const width = portrait ? 0.3 : 0.36;
	useFrame((state, delta) => {
		const g = group.current;
		if (g) g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.18, 3, delta);
		const k = grow.value;
		ranked.forEach((r, i) => {
			const mesh = bars.current[i];
			if (!mesh) return;
			// Each bar rises in turn, then follows its count.
			const share = max > 0 ? r.n / max : 0;
			const target = (BAR_MIN + (BAR_MAX - BAR_MIN) * share) * smooth(i * 0.04, i * 0.04 + 0.55, k);
			const lift = hovered === r.site.slug ? 0.08 : 0;
			const h = (heights.current[i] = THREE.MathUtils.damp(heights.current[i] ?? 0, Math.max(0.001, target + lift), 6, delta));
			mesh.scale.y = h;
			mesh.position.y = h / 2;
		});
	});
	return (
		<group ref={group} position-x={(-(ranked.length - 1) * gap) / 2}>
			{ranked.map((r, i) => {
				const leader = i === 0 && r.n > 0;
				const hot = hovered === r.site.slug;
				return (
					<mesh
						key={r.site.slug}
						ref={(m) => {
							bars.current[i] = m;
						}}
						position-x={i * gap}
						scale={[width, 0.001, width]}
						onPointerOver={(e) => {
							e.stopPropagation();
							onHover(r.site.slug);
							document.body.style.cursor = "pointer";
						}}
						onPointerOut={() => {
							onHover(null);
							document.body.style.cursor = "";
						}}
						onClick={(e) => {
							e.stopPropagation();
							onPick(r.site.slug);
						}}>
						<boxGeometry args={[1, 1, 1]} />
						<meshPhysicalMaterial
							color={leader ? t.accent : hot ? t.barHover : t.bar}
							metalness={0.15}
							roughness={0.22}
							clearcoat={1}
							clearcoatRoughness={0.1}
							emissive={leader ? t.accent : "#000000"}
							emissiveIntensity={leader ? 0.25 : 0}
						/>
					</mesh>
				);
			})}
		</group>
	);
}

export function BarsStage(props) {
	const t = usePalette();
	return (
		<View className="absolute inset-0">
			<PerspectiveCamera makeDefault position={[0, 3.0, 9.6]} rotation-x={-0.155} fov={28} />
			<Studio />
			<Bars {...props} />
			<ContactShadows position={[0, 0, 0]} opacity={t.shadow * 0.8} scale={10} blur={2} far={3} />
		</View>
	);
}

/* ───────────────────────── App phone ───────────────────────── */

function SpinningPhone() {
	const ref = useRef(null);
	useFrame((state) => {
		const g = ref.current;
		if (!g) return;
		const time = state.clock.elapsedTime;
		g.rotation.y = Math.sin(time * 0.45) * 0.55 + state.pointer.x * 0.15;
		g.rotation.x = -0.06 - state.pointer.y * 0.05;
		g.position.y = Math.sin(time * 1.1) * 0.06;
	});
	return (
		<group ref={ref}>
			<Phone />
		</group>
	);
}

export function AppStage() {
	const t = usePalette();
	return (
		<View className="absolute inset-0">
			<PerspectiveCamera makeDefault position={[0, 0, 8.2]} fov={30} />
			<Studio />
			<Suspense fallback={null}>
				<SpinningPhone />
			</Suspense>
			<ContactShadows position={[0, -1.95, 0]} opacity={t.shadow} scale={6} blur={2.6} far={3} />
		</View>
	);
}
