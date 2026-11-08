"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

import { paletteStore } from "@/lib/palettes";
import { DESTINATIONS } from "@/components/home3d/shapes";
import { GLOBE_R, MONUMENTS, globeMarks, landTexture, wheel } from "./models";
import { getGeo, loadGeo } from "./geo";

/*
 * One fixed scene behind the whole page. Each section of the page is a
 * "chapter" (an element with data-chapter) naming what stands on the stage:
 * the Konark wheel upright ("wheel"), a monument, the globe, or nothing.
 * Between chapters the wheel lies down to become the turntable, and each
 * monument is rebuilt out of it (and taken down again) by a cutting plane
 * that rises through it, its edge lit in the accent colour.
 */

const colorCache = {};
const colorOf = (hex) => (colorCache[hex] ??= new THREE.Color(hex));

/** Adds the cutting plane (and, for the globe, the land/sea mix) to a material. */
function patch(material, uniforms, { globe = false } = {}) {
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, uniforms);
		shader.vertexShader = `varying float vWorldY;\n${shader.vertexShader}`.replace(
			"#include <project_vertex>",
			"#include <project_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;",
		);
		let frag = `uniform float uCut;\nuniform vec3 uEdge;\nuniform vec3 uOcean;\nvarying float vWorldY;\n${shader.fragmentShader}`.replace(
			"void main() {",
			"void main() {\n\tif (vWorldY > uCut) discard;",
		);
		if (frag.includes("#include <emissivemap_fragment>"))
			frag = frag.replace(
				"#include <emissivemap_fragment>",
				"#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += uEdge * (1.0 - smoothstep(0.0, 0.07, uCut - vWorldY)) * 1.8;",
			);
		if (globe)
			frag = frag.replace(
				"#include <map_fragment>",
				"#ifdef USE_MAP\n\tdiffuseColor.rgb = mix(uOcean, diffuseColor.rgb, texture2D(map, vMapUv).r);\n#endif",
			);
		shader.fragmentShader = frag;
	};
	material.customProgramCacheKey = () => (globe ? "cut-globe" : "cut");
	return material;
}

function makeSet(geoms, opts = {}) {
	const uniforms = { uCut: { value: 999 }, uEdge: { value: new THREE.Color() }, uOcean: { value: new THREE.Color() } };
	const base = patch(new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.04, side: THREE.DoubleSide, flatShading: !!opts.flat, map: opts.map ?? null }), uniforms, opts);
	const accent = patch(new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide }), uniforms);
	const depth = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), uniforms);
	return { baseGeometry: geoms.base, accentGeometry: geoms.accent, height: geoms.height, always: !!opts.always, base, accent, depth, uniforms, build: 0 };
}

const smooth = (x) => {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
};
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// Built once, on first use, and shared: the frame loop changes their colours and cuts.
let SETS = null;
function getSets() {
	SETS ??= {
		wheelSet: makeSet(wheel(2), { always: true }),
		monuments: Object.fromEntries(Object.entries(MONUMENTS).map(([k, make]) => [k, makeSet(make(), { flat: k === "pyramids" })])),
		globeSet: makeSet({ base: new THREE.SphereGeometry(GLOBE_R, 96, 64), accent: globeMarks(DESTINATIONS), height: 4.1 }, { globe: true }),
	};
	return SETS;
}

function readChapters() {
	return [...document.querySelectorAll("[data-chapter]")].map((el) => ({
		el,
		model: el.dataset.chapter,
		side: el.dataset.side ?? "center",
		az: Number(el.dataset.az ?? 0),
		sun: Number(el.dataset.sun ?? 35),
	}));
}

function Stage() {
	const { camera, size } = useThree();
	const wheelOuter = useRef(null);
	const wheelInner = useRef(null);
	const table = useRef(null);
	const globeGroup = useRef(null);
	const sun = useRef(null);
	const chapters = useRef([]);
	const st = useRef({ up: 1, intro: 0, spin: 0, cam: new THREE.Vector3(0, 2, 11), look: new THREE.Vector3(0, 2, 0), sunAz: 35, sunEl: 0.9 });


	useEffect(() => {
		chapters.current = readChapters();
		loadGeo();
	}, []);

	useFrame(({ pointer, scene, clock }, rawDt) => {
		const dt = Math.min(rawDt, 0.25);
		const { wheelSet, monuments, globeSet } = getSets();
		const s = st.current;
		const palette = paletteStore.get();
		const c60 = colorOf(palette.c60);
		// On a light page the 30 is near-black: lift it a little so the stone keeps its shading.
		const c30 = palette.tone === "light" ? (colorCache[`${palette.c30}~${palette.c60}`] ??= colorOf(palette.c30).clone().lerp(colorOf(palette.c60), 0.38)) : colorOf(palette.c30);
		const c10 = colorOf(palette.c10);
		scene.background = c60;
		if (scene.fog) scene.fog.color.copy(c60);

		// The land texture arrives with the mask.
		const geo = getGeo();
		if (geo && !globeSet.base.userData.land) {
			globeSet.base.map = landTexture(geo.mask);
			globeSet.base.userData.land = true;
			globeSet.base.needsUpdate = true;
		}

		// Which chapter the middle of the screen is in, and how far through it.
		if (!chapters.current.length) chapters.current = readChapters();
		const list = chapters.current;
		const mid = size.height / 2;
		let cur = 0;
		let t = 0.5;
		for (let i = 0; i < list.length; i += 1) {
			const r = list[i].el.getBoundingClientRect();
			if (r.top <= mid && r.bottom > mid) {
				cur = i;
				t = (mid - r.top) / r.height;
				break;
			}
			if (i === list.length - 1 && r.bottom <= mid) {
				cur = i;
				t = 1;
			}
		}
		const ch = list[cur] ?? { model: "wheel", side: "right", az: 0, sun: 35 };
		const prev = list[cur - 1]?.model;
		const next = list[cur + 1]?.model;
		// A chapter's model rises over the first stretch and comes down over the last,
		// unless the neighbouring chapter shows the same thing.
		const rise = cur === 0 || prev === ch.model ? 1 : smooth(t / 0.2);
		const fall = cur === list.length - 1 || next === ch.model ? 1 : smooth((1 - t) / 0.2);
		const shown = Math.min(rise, fall);

		// The intro: the wheel is cut out of nothing from the bottom up.
		s.intro = Math.min(1, s.intro + dt / 2.6);

		// The wheel: upright on its rim for "wheel" chapters, otherwise lying down as the turntable.
		s.up = damp(s.up, ch.model === "wheel" ? 1 : 0, 3, dt);
		const u = smooth(s.up);
		s.spin += dt * (0.1 + u * 0.12);
		const wo = wheelOuter.current;
		if (wo) {
			wo.rotation.set(-Math.PI / 2 * (1 - u), -0.42 * u, 0);
			wo.position.y = THREE.MathUtils.lerp(-0.27, 2.08, u);
			wo.scale.setScalar(THREE.MathUtils.lerp(1.15, 1, u));
		}
		if (wheelInner.current) wheelInner.current.rotation.z = s.spin;
		if (table.current) table.current.rotation.y = s.spin;
		if (globeGroup.current) globeGroup.current.rotation.y = s.spin * 1.4 - 1.2;

		// Colours and cutting planes.
		const sets = [["wheel", wheelSet], ...Object.entries(monuments), ["globe", globeSet]];
		for (const [key, set] of sets) {
			set.base.color.copy(c30);
			set.accent.color.copy(c10);
			set.accent.emissive.copy(c10).multiplyScalar(0.25);
			set.uniforms.uEdge.value.copy(c10);
			set.uniforms.uOcean.value.copy(c60).lerp(c30, palette.tone === "light" ? 0.1 : 0.16);
			if (key === "wheel") {
				set.uniforms.uCut.value = s.intro >= 1 ? 999 : -0.3 + smooth(s.intro) * 4.6;
				continue;
			}
			const target = ch.model === key ? shown : 0;
			set.build = Math.abs(target - set.build) < 0.01 ? target : damp(set.build, target, 9, dt);
			const lo = key === "globe" ? 0.5 : -0.05;
			set.uniforms.uCut.value = set.build >= 0.999 ? 999 : lo + set.build * (set.height + 0.15 - lo);
		}

		// Camera: frame what is on stage, beside the text, and lean with the pointer.
		const mobile = size.width / size.height < 0.85;
		const model = ch.model === "none" ? (list[cur - 1]?.model ?? "wheel") : ch.model;
		const h = model === "wheel" ? 4 : model === "globe" ? 4 : monuments[model]?.height ?? 3;
		let lookY = model === "wheel" ? 2.08 : model === "globe" ? 1.9 : 0.4 + h * 0.32;
		let dist = model === "wheel" ? 11 : model === "globe" ? 12.5 : 13.2 + h * 0.4;
		const el = model === "wheel" || model === "globe" ? 0.1 : 0.36;
		const sideK = ch.side === "left" ? -1 : ch.side === "right" ? 1 : 0;
		let shift = mobile ? 0 : sideK * dist * 0.21;
		if (mobile) {
			dist *= model === "wheel" ? 1.75 : 1.32;
			lookY -= dist * 0.14;
			shift = 0;
		}
		const az = (ch.az * Math.PI) / 180 + pointer.x * 0.12;
		const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
		const goalCam = new THREE.Vector3(Math.sin(az) * Math.cos(el) * dist, lookY + Math.sin(el) * dist + pointer.y * 0.25, Math.cos(az) * Math.cos(el) * dist).addScaledVector(right, shift);
		const goalLook = new THREE.Vector3(0, lookY, 0).addScaledVector(right, shift);
		s.cam.x = damp(s.cam.x, goalCam.x, 3, dt);
		s.cam.y = damp(s.cam.y, goalCam.y, 3, dt);
		s.cam.z = damp(s.cam.z, goalCam.z, 3, dt);
		s.look.x = damp(s.look.x, goalLook.x, 3, dt);
		s.look.y = damp(s.look.y, goalLook.y, 3, dt);
		s.look.z = damp(s.look.z, goalLook.z, 3, dt);
		camera.position.copy(s.cam);
		camera.lookAt(s.look);

		// The sun swings to each chapter's hour, so shadows sweep across the stone.
		s.sunAz = damp(s.sunAz, ch.sun, 2, dt);
		const sl = sun.current;
		if (sl) {
			const a = (s.sunAz * Math.PI) / 180;
			sl.position.set(Math.sin(a) * 9, 8 + Math.sin(clock.elapsedTime * 0.1) * 0.3, Math.cos(a) * 9);
		}
	});

	const { wheelSet, monuments, globeSet } = getSets();
	return (
		<>
			<hemisphereLight args={["#ffffff", "#777777", 0.85]} />
			<directionalLight
				ref={sun}
				intensity={1.9}
				castShadow
				shadow-mapSize={[2048, 2048]}
				shadow-bias={-0.0004}
				shadow-normalBias={0.02}
				shadow-camera-left={-5}
				shadow-camera-right={5}
				shadow-camera-top={5}
				shadow-camera-bottom={-5}
				shadow-camera-near={1}
				shadow-camera-far={30}
			/>
			<group ref={wheelOuter}>
				<group ref={wheelInner}>
					<Solid set={wheelSet} />
				</group>
			</group>
			<group ref={table}>
				{Object.entries(monuments).map(([k, set]) => (
					<Solid key={k} set={set} />
				))}
			</group>
			<group ref={globeGroup} position={[0, 2.15, 0]}>
				<Solid set={globeSet} />
			</group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
				<planeGeometry args={[60, 60]} />
				<shadowMaterial opacity={0.18} />
			</mesh>
		</>
	);
}

/** A set's two meshes; hidden while nothing of it is built. */
function Solid({ set }) {
	const a = useRef(null);
	const b = useRef(null);
	useFrame(() => {
		const on = set.always || set.build > 0.002;
		if (a.current) a.current.visible = on;
		if (b.current) b.current.visible = on;
	});
	return (
		<>
			<mesh ref={a} geometry={set.baseGeometry} material={set.base} castShadow receiveShadow customDepthMaterial={set.depth} />
			<mesh ref={b} geometry={set.accentGeometry} material={set.accent} castShadow customDepthMaterial={set.depth} />
		</>
	);
}

export default function Scene() {
	return (
		<Canvas
			flat
			shadows="soft"
			dpr={[1, 1.6]}
			camera={{ position: [0, 2, 11], fov: 32, near: 0.1, far: 80 }}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			style={{ position: "fixed", inset: 0, zIndex: 0 }}
			eventSource={typeof document === "undefined" ? undefined : document.body}
			eventPrefix="client">
			<fog attach="fog" args={["#000", 16, 42]} />
			<Stage />
		</Canvas>
	);
}
