"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

import { paletteStore } from "@/lib/palettes";
import { MODELS, isReady, prepare, voxels } from "./voxels";
import { rng } from "../home3d/shapes";

// Each cube is placed by the GPU: it flies from its spot in one model to its
// spot in the next, shrinking mid-flight, each on its own delay.
const VERT_HEAD = /* glsl */ `
	uniform float uT;
	uniform float uSizeA;
	uniform float uSizeB;
	uniform float uTime;
	attribute vec3 aFrom;
	attribute vec3 aTo;
	attribute float aAccA;
	attribute float aAccB;
	attribute float aRand;
	varying float vAcc;
`;
const VERT_BODY = /* glsl */ `
	float d = aRand * 0.45;
	float t = smoothstep(d, d + 0.55, uT);
	float arc = sin(t * 3.14159);
	vec3 c = mix(aFrom, aTo, t);
	c += normalize(vec3(aRand - 0.5, 0.55, fract(aRand * 7.31) - 0.5)) * arc * 1.4;
	vAcc = mix(aAccA, aAccB, t);
	c.y += vAcc * 0.04 * sin(uTime * 2.0 + aRand * 30.0);
	float s = mix(uSizeA, uSizeB, t) * 0.86 * (1.0 - 0.6 * arc);
	transformed = transformed * s + c;
`;

const colorCache = {};
const colorOf = (hex) => (colorCache[hex] ??= new THREE.Color(hex));

function shadowTexture() {
	const c = document.createElement("canvas");
	c.width = c.height = 128;
	const g = c.getContext("2d");
	const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
	// alphaMap reads the green channel: white in the middle, black at the rim.
	grad.addColorStop(0, "#fff");
	grad.addColorStop(0.45, "#777");
	grad.addColorStop(1, "#000");
	g.fillStyle = grad;
	g.fillRect(0, 0, 128, 128);
	const t = new THREE.CanvasTexture(c);
	return t;
}

const smoothstep = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;

function Model({ models, progress, intro, invert, count }) {
	const mesh = useRef(null);
	const group = useRef(null);
	const ground = useRef(null);
	const state = useRef({ pair: "", intro: intro ? 0 : 1, spin: 0 });

	const { geometry, material, shadow } = useMemo(() => {
		const box = new THREE.BoxGeometry(1, 1, 1);
		const g = new THREE.InstancedBufferGeometry();
		g.index = box.index;
		g.setAttribute("position", box.getAttribute("position"));
		g.setAttribute("normal", box.getAttribute("normal"));
		g.instanceCount = count;
		const rand = new Float32Array(count);
		const r = rng(count);
		for (let i = 0; i < count; i += 1) rand[i] = r();
		g.setAttribute("aFrom", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
		g.setAttribute("aTo", new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3));
		g.setAttribute("aAccA", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
		g.setAttribute("aAccB", new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
		g.setAttribute("aRand", new THREE.InstancedBufferAttribute(rand, 1));

		const m = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
		const uniforms = {
			uT: { value: 0 },
			uSizeA: { value: 0.05 },
			uSizeB: { value: 0.05 },
			uTime: { value: 0 },
			uAccent: { value: new THREE.Color() },
		};
		m.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, uniforms);
			shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERT_BODY}`);
			shader.fragmentShader = `uniform vec3 uAccent;\nvarying float vAcc;\n${shader.fragmentShader}`
				.replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec4 diffuseColor = vec4( mix( diffuse, uAccent, vAcc ), opacity );")
				.replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = emissive + uAccent * vAcc * 0.35;");
		};
		m.userData.uniforms = uniforms;
		return { geometry: g, material: m, shadow: shadowTexture() };
	}, [count]);

	useFrame(({ pointer, clock }, delta) => {
		const g = group.current;
		const me = mesh.current;
		if (!g || !me) return;
		const st = state.current;
		const u = me.material.userData.uniforms;
		const palette = paletteStore.get();
		me.material.color.copy(colorOf(invert ? palette.c60 : palette.c30));
		u.uAccent.value.copy(colorOf(palette.c10));
		u.uTime.value = clock.elapsedTime;

		// Which two models we are between, and how far.
		let a;
		let b;
		let t;
		if (st.intro < 1) {
			st.intro = Math.min(1, st.intro + delta / 2.4);
			a = "scatter";
			b = models[0];
			t = st.intro;
		} else {
			const f = Math.min(models.length - 1, Math.max(0, progress?.current ?? 0));
			const i = Math.min(Math.floor(f), models.length - 2);
			a = models[Math.max(0, i)];
			b = models[Math.max(0, Math.min(models.length - 1, i + 1))];
			t = models.length > 1 ? f - Math.max(0, i) : 0;
		}
		prepare(a);
		prepare(b);
		const ka = isReady(a) ? a : "scatter";
		const kb = isReady(b) ? b : "scatter";
		const pair = `${ka}>${kb}`;
		if (pair !== st.pair) {
			st.pair = pair;
			const va = voxels(ka, count);
			const vb = voxels(kb, count);
			const attr = me.geometry.attributes;
			attr.aFrom.array.set(va.pos);
			attr.aTo.array.set(vb.pos);
			attr.aAccA.array.set(va.acc);
			attr.aAccB.array.set(vb.acc);
			for (const k of ["aFrom", "aTo", "aAccA", "aAccB"]) attr[k].needsUpdate = true;
			u.uSizeA.value = va.size;
			u.uSizeB.value = vb.size;
			st.bottomA = va.bottom;
			st.bottomB = vb.bottom;
		}
		u.uT.value = t;

		// Pose: ease from one model's to the next, turn slowly, lean toward the pointer.
		const pa = MODELS[ka].pose;
		const pb = MODELS[kb].pose;
		const e = smoothstep(Math.min(1, Math.max(0, t)));
		st.spin += delta * lerp(pa.spin ?? 0, pb.spin ?? 0, e) * Math.PI * 2 * 0.25;
		const sway = Math.sin(clock.elapsedTime * 0.5) * lerp(pa.sway ?? 0.12, pb.sway ?? 0.12, e);
		const targetY = lerp(pa.ry, pb.ry, e) + st.spin + sway + pointer.x * 0.35;
		const targetX = lerp(pa.rx, pb.rx, e) - pointer.y * 0.15;
		g.rotation.y += (targetY - g.rotation.y) * Math.min(1, delta * 4);
		g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 4);

		const gr = ground.current;
		if (gr) {
			const on = lerp(MODELS[ka].ground ? 1 : 0, MODELS[kb].ground ? 1 : 0, e);
			gr.material.opacity = on * (palette.tone === "light" ? 0.18 : 0.42);
			gr.position.y = lerp(st.bottomA ?? -2, st.bottomB ?? -2, e) - 0.08;
		}
	});

	return (
		<group ref={group}>
			<mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />
			<mesh ref={ground} rotation={[-Math.PI / 2, 0, 0]} scale={[7.5, 4.5, 1]}>
				<planeGeometry args={[1, 1]} />
				<meshBasicMaterial color="#000" alphaMap={shadow} transparent depthWrite={false} opacity={0} />
			</mesh>
		</group>
	);
}

/** One 3D model, morphing through `models` as `progress.current` runs 0 → models.length − 1. */
export default function Stage({ models, progress, intro = false, invert = false, active, count, eventSource, zoom = 11 }) {
	return (
		<Canvas
			flat
			dpr={[1, 1.75]}
			frameloop={active ? "always" : "never"}
			camera={{ position: [0, 0, zoom], fov: 35, near: 0.1, far: 80 }}
			gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
			eventSource={eventSource}
			eventPrefix="client">
			<hemisphereLight args={["#ffffff", "#808080", 1.15]} />
			<directionalLight position={[4, 7, 6]} intensity={1.9} />
			<directionalLight position={[-6, 2, -4]} intensity={0.55} />
			<Model models={models} progress={progress} intro={intro} invert={invert} count={count} />
		</Canvas>
	);
}
