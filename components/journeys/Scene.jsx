"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import { assetUrl } from "@/lib/journeys/config";
import { DESKTOP, MOBILE } from "@/lib/journeys/keyframes";
import { stage } from "./store";

const DRACO_PATH = "/draco/gltf/";
const URLS = {
	pillar: assetUrl("/journeys/models/palace-pillar.glb"),
	today: assetUrl("/journeys/models/palace-pillar-today.webp"),
	fort: assetUrl("/journeys/models/fort-gateway.glb"),
	dome: assetUrl("/journeys/models/victoria-dome.glb"),
	colonnade: assetUrl("/journeys/models/museum-colonnade.glb"),
};
const HEIGHT = 5.5; // every object is normalised to this height, base at the origin

const smooth = (k) => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

function poseAt(keys, t) {
	// Frame i is centred at t = i + 0.5; ease from pose i to pose i + 1 across the next frame.
	const last = keys.length - 1;
	const u = Math.min(Math.max(t - 0.5, 0), last);
	const i = Math.min(Math.floor(u), last - 1);
	const k = smooth(Math.min(Math.max(u - i, 0), 1));
	const a = keys[i];
	const b = keys[Math.min(i + 1, last)];
	return {
		p: [lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k)],
		r: [lerp(a.r[0], b.r[0], k), lerp(a.r[1], b.r[1], k), lerp(a.r[2], b.r[2], k)],
		s: lerp(a.s, b.s, k),
		mix: lerp(a.mix, b.mix, k),
		fade: lerp(a.fade, b.fade, k),
	};
}

// One animation step: ease the object's current pose toward the scroll target and apply it.
// A plain function (not a hook) so the React Compiler's immutability rules stay out of the way.
function stepPose(c, keys, g, materials, state, dt, { idle = false, mobile = false }) {
	if (!g) return;
	const target = poseAt(keys, stage.t);
	const k = 1 - Math.exp(-Math.min(dt, 0.05) * 6);
	for (let i = 0; i < 3; i++) {
		c.p[i] = lerp(c.p[i], target.p[i], k);
		c.r[i] = lerp(c.r[i], target.r[i], k);
	}
	c.s = lerp(c.s, target.s, k);
	c.mix = lerp(c.mix, target.mix, k);
	c.fade = lerp(c.fade, target.fade, k);
	// Slow idle turn in the hero, fading out as the walk begins; a gentle sway everywhere else.
	const hero = idle ? Math.max(0, 1 - Math.max(0, stage.t - 0.5)) * state.clock.elapsedTime * 0.18 : 0;
	const sway = Math.sin(state.clock.elapsedTime * 0.5) * 0.04;
	const drift = mobile ? 0 : stage.pointerX * 0.06;
	g.visible = c.fade > 0.02;
	g.position.set(c.p[0], c.p[1], c.p[2]);
	g.rotation.set(c.r[0], c.r[1] + hero + sway + drift, c.r[2]);
	g.scale.setScalar(c.s);
	for (const m of materials) {
		m.color.setScalar(c.fade);
		if (m.userData.uniforms) m.userData.uniforms.uMix.value = c.mix;
	}
	if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
		(window.__jrPoses ||= {})[idle ? "pillar" : g.uuid] = { ...c, visible: g.visible, mats: materials.length };
	}
}

// Scale the loaded object to HEIGHT and put its base centre at the origin.
function normalise(inner, scene) {
	inner.scale.setScalar(1);
	inner.position.set(0, 0, 0);
	inner.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(scene);
	const size = box.getSize(new THREE.Vector3());
	const k = HEIGHT / (size.y || 1);
	const centre = box.getCenter(new THREE.Vector3());
	inner.scale.setScalar(k);
	inner.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
	if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
		(window.__jrNorm ||= []).push({ min: box.min.toArray(), max: box.max.toArray(), k, meshes: scene.children.length });
	}
}

// Meshy materials come in as MeshStandardMaterial with the photographic base colour. Keep that,
// settle roughness so the spotlights read as a museum display, and (hero only) teach the
// shader to crossfade to the faded "today" map with uMix.
function prepareMaterials(scene, today) {
	const materials = [];
	scene.traverse((o) => {
		if (!o.isMesh) return;
		// Draco-decoded Meshy geometry can carry a bad bounding sphere; never let it cull the object.
		o.frustumCulled = false;
		const m = o.material;
		if (!m || materials.includes(m)) return;
		m.roughness = 0.78;
		m.metalness = 0;
		if (m.map) m.map.anisotropy = 4;
		if (today) {
			const uniforms = { uNow: { value: today }, uMix: { value: 1 } };
			m.onBeforeCompile = (shader) => {
				Object.assign(shader.uniforms, uniforms);
				shader.fragmentShader = shader.fragmentShader
					.replace("#include <common>", "#include <common>\nuniform sampler2D uNow;\nuniform float uMix;")
					.replace(
						"#include <map_fragment>",
						"vec4 sampledDiffuseColor = mix(texture2D(uNow, vMapUv) * 1.25, texture2D(map, vMapUv), uMix);\ndiffuseColor *= sampledDiffuseColor;",
					);
			};
			m.customProgramCacheKey = () => "jr-crossfade";
			m.userData.uniforms = uniforms;
			m.needsUpdate = true;
		}
		materials.push(m);
	});
	return materials;
}

function Pillar({ mobile, onReady }) {
	const group = useRef(null);
	const inner = useRef(null);
	const mats = useRef([]);
	const readyRef = useRef(onReady);
	const { scene } = useGLTF(URLS.pillar, DRACO_PATH);
	const keys = (mobile ? MOBILE : DESKTOP).pillar;

	useEffect(() => {
		readyRef.current = onReady;
	}, [onReady]);

	useEffect(() => {
		let disposed = false;
		normalise(inner.current, scene);
		new THREE.TextureLoader().load(URLS.today, (today) => {
			if (disposed) return;
			today.flipY = false;
			today.colorSpace = THREE.SRGBColorSpace;
			today.anisotropy = 4;
			mats.current = prepareMaterials(scene, today);
			readyRef.current?.();
		});
		return () => {
			disposed = true;
			mats.current = [];
		};
	}, [scene]);

	const current = useRef(poseAt(keys, 0.5));
	useFrame((state, dt) => stepPose(current.current, keys, group.current, mats.current, state, dt, { idle: true, mobile }));

	return (
		<group ref={group}>
			<group ref={inner}>
				<primitive object={scene} />
			</group>
		</group>
	);
}

// A card monument in the scroll stage, dimmed by its pose's fade.
function Teaser({ name, mobile }) {
	const group = useRef(null);
	const inner = useRef(null);
	const mats = useRef([]);
	const { scene } = useGLTF(URLS[name], DRACO_PATH);
	const keys = (mobile ? MOBILE : DESKTOP)[name];

	useEffect(() => {
		normalise(inner.current, scene);
		mats.current = prepareMaterials(scene, null);
		return () => {
			mats.current = [];
		};
	}, [scene]);

	const current = useRef(poseAt(keys, 0.5));
	useFrame((state, dt) => stepPose(current.current, keys, group.current, mats.current, state, dt, { mobile }));

	return (
		<group ref={group} visible={false}>
			<group ref={inner}>
				<primitive object={scene} />
			</group>
		</group>
	);
}

// Museum spot: a warm key from upper front-left, a cool rim from behind right, a faint fill.
function Lights() {
	return (
		<>
			<ambientLight intensity={0.22} />
			<spotLight position={[-7, 9, 8]} angle={0.55} penumbra={0.7} intensity={1000} color="#ffe2c2" decay={1.6} />
			<spotLight position={[8, 7, -5]} angle={0.6} penumbra={0.8} intensity={340} color="#c7d6ff" decay={1.6} />
		</>
	);
}

function ContextGuard({ onLost }) {
	const { gl } = useThree();
	useEffect(() => {
		const canvas = gl.domElement;
		const lost = (e) => {
			e.preventDefault();
			onLost?.();
		};
		canvas.addEventListener("webglcontextlost", lost);
		return () => canvas.removeEventListener("webglcontextlost", lost);
	}, [gl, onLost]);
	return null;
}

/**
 * One fixed, full-screen canvas behind the page. The hero pillar loads first; the three card
 * monuments load once it is on screen and fly in on the frames that call for them. `active`
 * false (tab hidden, or the solid sections cover the screen) stops the frame loop entirely.
 */
export default function Scene({ active, mobile, onReady, onLost }) {
	const [others, setOthers] = useState(false);
	return (
		<Canvas
			dpr={[1, mobile ? 1.25 : 1.5]}
			frameloop={active ? "always" : "never"}
			camera={{ fov: 34, position: [0, 0, 11.4], near: 0.1, far: 60 }}
			gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
			style={{ background: "transparent" }}
		>
			<ContextGuard onLost={onLost} />
			<Lights />
			<Suspense fallback={null}>
				<Pillar
					mobile={mobile}
					onReady={() => {
						onReady?.();
						setOthers(true);
					}}
				/>
			</Suspense>
			{others ? (
				<Suspense fallback={null}>
					<Teaser name="fort" mobile={mobile} />
					<Teaser name="dome" mobile={mobile} />
					<Teaser name="colonnade" mobile={mobile} />
				</Suspense>
			) : null}
		</Canvas>
	);
}

useGLTF.preload(URLS.pillar, DRACO_PATH);
