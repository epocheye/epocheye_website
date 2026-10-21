"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

import { DESKTOP, MOBILE } from "@/lib/journeys/keyframes";
import { stage } from "./store";

const MODEL_URL = "/journeys/models/palace-pillar.glb";
const TODAY_URL = "/journeys/models/palace-pillar-today.webp";
const DRACO_PATH = "/draco/gltf/";

// Lighting is baked into both textures, so the material is unlit: the only work per pixel is
// the crossfade between "today" (faded) and "1791" (painted) driven by uMix.
const VERT = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;
const FRAG = /* glsl */ `
	uniform sampler2D uThen;
	uniform sampler2D uNow;
	uniform float uMix;
	uniform float uFade;
	varying vec2 vUv;
	void main() {
		vec3 now = texture2D(uNow, vUv).rgb;
		vec3 then = texture2D(uThen, vUv).rgb;
		vec3 c = mix(now, then, uMix) * uFade;
		gl_FragColor = vec4(c, 1.0);
		#include <tonemapping_fragment>
		#include <colorspace_fragment>
	}
`;

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

function Pillar({ mobile, onReady }) {
	const group = useRef(null);
	const mat = useRef(null);
	const readyRef = useRef(onReady);
	const { scene } = useGLTF(MODEL_URL, DRACO_PATH);
	const keys = mobile ? MOBILE : DESKTOP;
	// Start at the hero pose so the first rendered frame already matches the poster.
	const current = useRef(poseAt(DESKTOP, 0.5));

	useEffect(() => {
		readyRef.current = onReady;
	}, [onReady]);

	// Swap the GLB's material for the unlit two-texture crossfade once the "today" map is in.
	useEffect(() => {
		let disposed = false;
		let then = null;
		scene.traverse((o) => {
			if (o.isMesh && o.material?.map && !then) then = o.material.map;
		});
		new THREE.TextureLoader().load(TODAY_URL, (today) => {
			if (disposed) return;
			today.flipY = false;
			today.colorSpace = THREE.SRGBColorSpace;
			today.anisotropy = 4;
			if (then) then.anisotropy = 4;
			const material = new THREE.ShaderMaterial({
				vertexShader: VERT,
				fragmentShader: FRAG,
				uniforms: {
					uThen: { value: then },
					uNow: { value: today },
					uMix: { value: 1 },
					uFade: { value: 1 },
				},
			});
			scene.traverse((o) => {
				if (o.isMesh) {
					o.material = material;
					o.frustumCulled = false;
				}
			});
			mat.current = material;
			readyRef.current?.();
		});
		return () => {
			disposed = true;
			mat.current?.dispose();
			mat.current = null;
		};
	}, [scene]);

	useFrame((state, dt) => {
		const g = group.current;
		if (!g) return;
		const target = poseAt(keys, stage.t);
		const c = current.current;
		const k = 1 - Math.exp(-Math.min(dt, 0.05) * 7);
		for (let i = 0; i < 3; i++) {
			c.p[i] = lerp(c.p[i], target.p[i], k);
			c.r[i] = lerp(c.r[i], target.r[i], k);
		}
		c.s = lerp(c.s, target.s, k);
		c.mix = lerp(c.mix, target.mix, k);
		c.fade = lerp(c.fade, target.fade, k);
		// Slow idle turn in the hero, fading out as the walk begins.
		const idle = Math.max(0, 1 - Math.max(0, stage.t - 0.5)) * state.clock.elapsedTime * 0.18;
		const drift = mobile ? 0 : stage.pointerX * 0.06;
		g.position.set(c.p[0], c.p[1], c.p[2]);
		g.rotation.set(c.r[0], c.r[1] + idle + drift, c.r[2]);
		g.scale.setScalar(c.s);
		const m = mat.current;
		if (m) {
			m.uniforms.uMix.value = c.mix;
			m.uniforms.uFade.value = c.fade;
		}
	});

	return (
		<group ref={group}>
			<primitive object={scene} />
		</group>
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
 * One fixed, full-screen canvas behind the page. `active` false (tab hidden, or the solid
 * sections cover the screen) stops the frame loop entirely.
 */
export default function Scene({ active, mobile, onReady, onLost }) {
	return (
		<Canvas
			flat
			dpr={[1, mobile ? 1.5 : 2]}
			frameloop={active ? "always" : "never"}
			camera={{ fov: 34, position: [0, 0, 11.4], near: 0.1, far: 60 }}
			gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
			style={{ background: "transparent" }}
		>
			<ContextGuard onLost={onLost} />
			<Suspense fallback={null}>
				<Pillar mobile={mobile} onReady={onReady} />
			</Suspense>
		</Canvas>
	);
}

useGLTF.preload(MODEL_URL, DRACO_PATH);
