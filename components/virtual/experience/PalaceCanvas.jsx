"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, advance, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, PerformanceMonitor, Sky, Sparkles, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import { HALL, STOPS, TIERS, WAYPOINTS, planToWorld, tierOf } from "@/lib/virtual/journey";
import { journey } from "./store";

const MODEL_URL = "/virtual/palace-lite.glb";
const HDRI_URL = "/virtual/env/kloppenheim_06_puresky_1k.hdr";
const TEX_MANIFEST = "/virtual/tex/manifest.json";

// Dusk: the sun sets behind the palace, a little to the left as you face the main facade, so the
// building stands against the glow and the lamplit colonnade reads from the lawn.
// Plan direction (-0.45, 0.90) -> world (x, z) = (-0.45, -0.90).
const SUN_DIR = new THREE.Vector2(-0.45, -0.9).normalize();
const SUN_DISTANCE = 90;
const PALACE_CENTRE = new THREE.Vector3(...planToWorld([0, 11.5, 0]));
const HALL_FILL = planToWorld([0.5, 10, 2.4]);
const CEILING_FILL = planToWorld([0.5, 11, 3.4]);
// Warm light spilling out along the colonnade at dusk. Light only: no lamp fixtures are modelled,
// because none are recorded.
const COLONNADE_GLOW = [-7, 0, 7].map((x) => planToWorld([x, 2.6, 2.8]));

// Shared across the model and the streamed texture sets.
let ktx2 = null;
function getKtx2(gl) {
	if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath("/virtual/basis/").detectSupport(gl);
	return ktx2;
}

// ---------------------------------------------------------------------------------------------
// Camera path: one centripetal Catmull-Rom spline through every waypoint, for position and for
// look target. Each chapter holds at its station, then eases along the spline to the next.

const pathPositions = new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w.position)), false, "centripetal");
const pathTargets = new THREE.CatmullRomCurve3(WAYPOINTS.map((w) => new THREE.Vector3(...w.target)), false, "centripetal");
const STATION_U = STOPS.map((s) => WAYPOINTS.findIndex((w) => w.station === s.id) / (WAYPOINTS.length - 1));
const HOLD = 0.35; // share of each chapter spent standing at its station
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function sample(t, out) {
	const last = STOPS.length - 1;
	const i = Math.min(Math.floor(t), last);
	const f = i === last ? 0 : t - i;
	const k = f < HOLD ? 0 : easeInOut((f - HOLD) / (1 - HOLD));
	const u = STATION_U[i] + (STATION_U[Math.min(i + 1, last)] - STATION_U[i]) * k;
	pathPositions.getPoint(u, out.position);
	pathTargets.getPoint(u, out.target);
	out.sunElevation = STOPS[i].sun + (STOPS[Math.min(i + 1, last)].sun - STOPS[i].sun) * k;
	// The aerials drift slowly while held, so the opening and closing shots are never frozen.
	out.drift = i === 0 || i === last ? 1 - k : 0;
	return out;
}

// Wide on phones held upright, narrower on desktop: hold the horizontal view near 80 degrees.
function fitLens(camera, aspect) {
	const hFov = (80 * Math.PI) / 180;
	const vFov = (2 * Math.atan(Math.tan(hFov / 2) / aspect) * 180) / Math.PI;
	camera.fov = THREE.MathUtils.clamp(vFov, 48, 78);
	camera.near = 0.15;
	camera.far = 1200;
	camera.updateProjectionMatrix();
}

// ---------------------------------------------------------------------------------------------
// Shared shader pieces: world-space weathering for every surface, and a breeze for leaves.

const ambient = { uTime: { value: 0 }, uWind: { value: 1 } };
// Capture-mode debugging: /virtual?shot=lawn&clean=1&no=shadows,clouds to switch features off.
const OFF = new Set(typeof window === "undefined" ? [] : (new URLSearchParams(window.location.search).get("no") || "").split(","));
const shadows = { dirty: true }; // set when materials change; the rig re-renders the shadow map

const NOISE = /* glsl */ `
float vHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vNoise(vec3 x) {
	vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(vHash(i), vHash(i + vec3(1,0,0)), f.x), mix(vHash(i + vec3(0,1,0)), vHash(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(vHash(i + vec3(0,0,1)), vHash(i + vec3(1,0,1)), f.x), mix(vHash(i + vec3(0,1,1)), vHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float vFbm(vec3 p) { return 0.55 * vNoise(p) + 0.3 * vNoise(p * 2.03) + 0.15 * vNoise(p * 4.11); }
`;

// Large, soft variation in tone and roughness, plus a little grime toward the ground, so tiled
// textures stop reading as tiles and nothing looks freshly painted. Neutral by design: it only
// darkens and varies, it never adds pattern, so it cannot make an unrecorded surface look documented.
function weather(material) {
	if (material.userData.weathered) return;
	material.userData.weathered = true;
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = shader.vertexShader
			.replace("#include <common>", "#include <common>\nvarying vec3 vWorldPos;")
			.replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
		shader.fragmentShader = shader.fragmentShader
			.replace("#include <common>", `#include <common>\nvarying vec3 vWorldPos;\n${NOISE}`)
			.replace(
				"#include <map_fragment>",
				`#include <map_fragment>
				float wBroad = vFbm(vWorldPos * 0.18);
				float wFine = vFbm(vWorldPos * 1.7);
				float grime = 1.0 - (1.0 - smoothstep(-0.9, 0.6, vWorldPos.y)) * 0.14;
				diffuseColor.rgb *= mix(0.8, 1.06, wBroad) * mix(0.94, 1.03, wFine) * grime;`,
			)
			.replace(
				"#include <roughnessmap_fragment>",
				`#include <roughnessmap_fragment>
				roughnessFactor = clamp(roughnessFactor + (wBroad - 0.5) * 0.18, 0.04, 1.0);`,
			);
	};
	material.customProgramCacheKey = () => "weathered";
	material.needsUpdate = true;
}

function sway(material) {
	if (material.userData.sway) return;
	material.userData.sway = true;
	material.side = THREE.DoubleSide;
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uTime = ambient.uTime;
		shader.uniforms.uWind = ambient.uWind;
		shader.vertexShader = shader.vertexShader
			.replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWind;")
			.replace(
				"#include <begin_vertex>",
				`#include <begin_vertex>
				vec4 swWorld = modelMatrix * vec4(position, 1.0);
				float swLift = clamp(swWorld.y * 0.08, 0.0, 1.0);
				transformed.x += sin(uTime * 1.3 + swWorld.x * 0.4 + swWorld.z * 0.3) * 0.06 * swLift * uWind;
				transformed.z += cos(uTime * 1.1 + swWorld.z * 0.5) * 0.05 * swLift * uWind;`,
			);
	};
	material.customProgramCacheKey = () => "sway";
	material.needsUpdate = true;
}

// ---------------------------------------------------------------------------------------------

function CameraRig({ skyRef, sunRef, cloudsRef }) {
	const rig = useRef(null);

	useFrame((frame, dt) => {
		if (!rig.current) {
			rig.current = { position: new THREE.Vector3(), target: new THREE.Vector3(), look: new THREE.Vector3(), sun: new THREE.Vector3(), lastSun: new THREE.Vector3(), aspect: 0, first: true };
		}
		const state = rig.current;
		const { camera, size, gl } = frame;
		const time = frame.clock.elapsedTime;
		const still = journey.reducedMotion;

		const aspect = size.width / Math.max(1, size.height);
		if (aspect !== state.aspect) {
			state.aspect = aspect;
			fitLens(camera, aspect);
		}

		const s = sample(journey.t, state);
		if (s.drift > 0 && !still) {
			s.position.x += Math.sin(time * 0.05) * 6 * s.drift;
			s.position.z += Math.cos(time * 0.04) * 4 * s.drift;
		}
		// Opening move: once the palace has loaded, the camera settles in from higher and further out.
		if (!still && !journey.locked) {
			const since = journey.readyAt ? (performance.now() - journey.readyAt) / 1000 : 0;
			const away = Math.pow(1 - THREE.MathUtils.clamp(since / 5.5, 0, 1), 3);
			if (away > 0) {
				s.position.lerp(s.target, -0.45 * away);
				s.position.y += 14 * away;
			}
		}

		// Damped follow of the scroll position: smooth, never a jump.
		const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3);
		if (state.first || journey.locked) {
			camera.position.copy(s.position);
			state.look.copy(s.target);
			state.first = false;
		} else {
			camera.position.lerp(s.position, k);
			state.look.lerp(s.target, k);
		}
		const lookSway = still ? 0 : 0.5;
		camera.lookAt(state.look.x + journey.pointerX * lookSway, state.look.y - journey.pointerY * lookSway * 0.5, state.look.z);

		// Haze thins as the camera climbs.
		const fog = frame.scene.fog;
		if (fog) {
			const high = THREE.MathUtils.clamp(camera.position.y / 30, 0, 1);
			fog.near = 24 + high * 50;
			fog.far = 190 + high * 300;
		}

		// Sun: elevation follows the chapters; azimuth breathes very slightly, so light is never static.
		const el = THREE.MathUtils.degToRad(s.sunElevation + (still ? 0 : Math.sin(time * 0.07) * 0.4));
		const az = still ? 0 : Math.sin(time * 0.05) * 0.015;
		const dx = SUN_DIR.x * Math.cos(az) - SUN_DIR.y * Math.sin(az);
		const dz = SUN_DIR.x * Math.sin(az) + SUN_DIR.y * Math.cos(az);
		state.sun.set(dx * Math.cos(el), Math.sin(el), dz * Math.cos(el)).normalize();
		if (skyRef.current) skyRef.current.material.uniforms.sunPosition.value.copy(state.sun);
		if (sunRef.current) {
			const light = sunRef.current;
			light.position.copy(PALACE_CENTRE).addScaledVector(state.sun, SUN_DISTANCE);
			light.target.position.copy(PALACE_CENTRE);
			light.target.updateMatrixWorld();
			// Dusk: a low, deep amber sun that fades as it sets.
			const dusk = THREE.MathUtils.clamp(s.sunElevation / 4.5, 0, 1);
			light.color.setHSL(0.065, 0.85, 0.58);
			light.intensity = 0.6 + dusk * 2.6;
			// Shadows are re-rendered only when the sun has actually moved.
			if (shadows.dirty || state.sun.distanceToSquared(state.lastSun) > 1e-6) {
				shadows.dirty = false;
				gl.shadowMap.needsUpdate = true;
				state.lastSun.copy(state.sun);
			}
		}

		ambient.uTime.value = still ? 0 : time;
		ambient.uWind.value = still ? 0 : 1;
		if (cloudsRef.current) cloudsRef.current.material.uniforms.uTime.value = still ? 0 : time;
	});
	return null;
}

// Swap in sharper textures once the walk has started: 1K on phones, 2K on desktop.
function useStreamedTextures(scene, gl, set, start) {
	useEffect(() => {
		if (!start || !set) return undefined;
		let cancelled = false;
		(async () => {
			const manifest = await fetch(TEX_MANIFEST).then((r) => r.json()).catch(() => null);
			const names = new Set(manifest?.[set] || []);
			if (!names.size) return;
			const loader = getKtx2(gl);
			const byName = new Map();
			scene.traverse((obj) => {
				if (!obj.isMesh) return;
				const mat = obj.userData.original || obj.material;
				for (const slot of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"]) {
					const tex = mat[slot];
					if (!tex?.name || !names.has(tex.name)) continue;
					if (!byName.has(tex.name)) byName.set(tex.name, []);
					byName.get(tex.name).push([mat, slot, tex]);
				}
			});
			for (const [name, uses] of byName) {
				if (cancelled) return;
				const url = `/virtual/tex/${set}/${name.replace(/\.(jpe?g|png)$/i, ".ktx2")}`;
				const next = await loader.loadAsync(url).catch(() => null);
				if (!next || cancelled) continue;
				const old = uses[0][2];
				next.name = name;
				next.colorSpace = old.colorSpace;
				next.wrapS = old.wrapS;
				next.wrapT = old.wrapT;
				next.repeat.copy(old.repeat);
				next.offset.copy(old.offset);
				next.channel = old.channel;
				next.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
				for (const [mat, slot] of uses) {
					mat[slot] = next;
					mat.needsUpdate = true;
				}
				old.dispose();
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [scene, gl, set, start]);
}

function Palace({ evidence, textureSet, streamTextures }) {
	const gl = useThree((s) => s.gl);
	const { scene } = useGLTF(MODEL_URL, false, true, (loader) => loader.setKTX2Loader(getKtx2(gl)));

	const tierMaterials = useMemo(() => {
		const out = {};
		for (const [key, tier] of Object.entries(TIERS)) {
			out[key] = new THREE.MeshStandardMaterial({ color: tier.color, roughness: 0.85, vertexColors: true });
		}
		return out;
	}, []);

	useEffect(() => {
		scene.traverse((obj) => {
			if (!obj.isMesh) return;
			if (!obj.userData.original) {
				obj.userData.original = obj.material;
				obj.castShadow = true;
				obj.receiveShadow = true;
				if (OFF.has("shaders")) {
					// leave materials untouched
				} else if (obj.material.name.startsWith("FOLIAGE")) sway(obj.material);
				else weather(obj.material);
			}
			const original = obj.userData.original;
			obj.material = evidence ? tierMaterials[tierOf(original.name)] : original;
		});
		shadows.dirty = true;
	}, [scene, evidence, tierMaterials]);

	useStreamedTextures(scene, gl, textureSet, streamTextures && !OFF.has("stream"));

	return <primitive object={scene} />;
}

// The modelled site ends; the world should not. Textured ground runs on into the haze.
function Ground() {
	const gl = useThree((s) => s.gl);
	const material = useMemo(() => {
		const m = new THREE.MeshStandardMaterial({ color: "#9a9070", roughness: 1 });
		weather(m);
		getKtx2(gl).load("/virtual/tex/1k/grass.ktx2", (tex) => {
			tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
			tex.repeat.set(220, 220);
			tex.colorSpace = THREE.SRGBColorSpace;
			m.map = tex;
			m.needsUpdate = true;
		});
		return m;
	}, [gl]);
	return (
		<mesh rotation-x={-Math.PI / 2} position-y={-1.16} receiveShadow material={material}>
			<circleGeometry args={[1100, 64]} />
		</mesh>
	);
}

// A soft cloud layer drifting across the sky dome.
const cloudMaterial = new THREE.ShaderMaterial({
	transparent: true,
	depthWrite: false,
	side: THREE.BackSide,
	uniforms: { uTime: { value: 0 } },
	vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
	fragmentShader: /* glsl */ `
		varying vec3 vDir; uniform float uTime;
		${NOISE}
		void main() {
			if (vDir.y < 0.02) discard;
			vec2 uv = vDir.xz / (vDir.y + 0.25) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
			float c = vFbm(vec3(uv, 0.0) * 1.3);
			c = smoothstep(0.52, 0.82, c) * smoothstep(0.02, 0.25, vDir.y);
			// Undersides lit by the set sun: warm near the horizon, ash above.
			vec3 tint = mix(vec3(0.98, 0.62, 0.42), vec3(0.42, 0.36, 0.38), smoothstep(0.05, 0.5, vDir.y));
			gl_FragColor = vec4(tint, c * 0.5);
		}`,
});

function Clouds({ cloudsRef }) {
	return (
		<mesh ref={cloudsRef} material={cloudMaterial} renderOrder={-1} frustumCulled={false}>
			<sphereGeometry args={[1000, 32, 16]} />
		</mesh>
	);
}

export default function PalaceCanvas({ evidence, onReady, onLost, quality = "high", active = true, capture = false, streamTextures, onDecline, className = "absolute inset-0" }) {
	const skyRef = useRef(null);
	const sunRef = useRef(null);
	const cloudsRef = useRef(null);
	const high = quality === "high";

	return (
		<Canvas
			className={className}
			frameloop={capture || !active ? "never" : "always"}
			dpr={high ? [1, 1.75] : [1, 1.4]}
			shadows={OFF.has("shadows") ? false : { type: THREE.PCFSoftShadowMap, autoUpdate: false }}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			camera={{ position: [0, 40, 80], fov: 60 }}
			onCreated={({ gl }) => {
				gl.toneMapping = THREE.AgXToneMapping;
				gl.toneMappingExposure = 1.0;
				gl.shadowMap.autoUpdate = false;
				// Phones can drop the GPU context under memory pressure; fall back to a still.
				gl.domElement.addEventListener("webglcontextlost", (e) => {
					e.preventDefault();
					onLost?.();
				});
			}}>
			<PerformanceMonitor onDecline={onDecline} />
			<AdaptiveDpr pixelated={false} />
			<color attach="background" args={["#120c08"]} />
			<fog attach="fog" args={["#24180f", 24, 190]} />
			<Sky ref={skyRef} distance={4500} turbidity={10} rayleigh={2.6} mieCoefficient={0.009} mieDirectionalG={0.9} />
			{OFF.has("clouds") ? null : <Clouds cloudsRef={cloudsRef} />}
			{OFF.has("env") ? null : <Environment files={HDRI_URL} environmentIntensity={0.32} />}
			<hemisphereLight args={["#6a76a0", "#2a1c12", 0.55]} />
			{/* Lamplight inside: at dusk the hall glows warmer than the sky outside. */}
			<pointLight position={HALL_FILL} intensity={150} distance={30} decay={2} color="#ffae62" />
			<pointLight position={CEILING_FILL} intensity={12} distance={11} decay={2} color="#ffb877" />
			{high ? COLONNADE_GLOW.map((p) => <pointLight key={p.join()} position={p} intensity={22} distance={11} decay={2} color="#ffa95c" />) : null}
			<directionalLight
				ref={sunRef}
				castShadow
				intensity={3}
				shadow-mapSize={high ? [2048, 2048] : [1024, 1024]}
				shadow-bias={-0.0004}
				shadow-normalBias={0.03}
				shadow-radius={4}
				shadow-camera-left={-36}
				shadow-camera-right={36}
				shadow-camera-top={36}
				shadow-camera-bottom={-36}
				shadow-camera-near={10}
				shadow-camera-far={200}
			/>
			{OFF.has("ground") ? null : <Ground />}
			<Suspense fallback={null}>
				<Palace evidence={evidence} textureSet={high ? "2k" : "1k"} streamTextures={streamTextures} />
				<Ready onReady={onReady} />
			</Suspense>
			{/* Dust in the light shafts of the hall. */}
			{OFF.has("sparkles") ? null : <Sparkles count={high ? 220 : 90} scale={HALL.size} position={HALL.centre} size={1.6} speed={0.12} opacity={0.6} noise={0.4} color="#ffd9a0" />}
			{/* Gold dust drifting in the evening air around the building. */}
			{OFF.has("sparkles") ? null : <Sparkles count={high ? 260 : 110} scale={[90, 24, 90]} position={PALACE_CENTRE.toArray()} size={3.2} speed={0.18} opacity={0.55} noise={1} color="#ffc56e" />}
			<CameraRig skyRef={skyRef} sunRef={sunRef} cloudsRef={cloudsRef} />
			{capture ? <Capture /> : null}
			{capture ? <ManualClock /> : null}
			{/* Bloom on desktop only. No multisampling in the composer: with it Chrome failed a
			    depth/stencil framebuffer blit every frame, which can end in a lost context. The
			    composer renders untonemapped, so AgX is applied as its last pass. */}
			{high && !capture && !OFF.has("post") ? (
				<EffectComposer multisampling={0} enableNormalPass={false}>
					<Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.7} />
					<ToneMapping mode={ToneMappingMode.AGX} />
				</EffectComposer>
			) : null}
		</Canvas>
	);
}

// Capture mode renders on a timer, not on animation frames: browsers stop animation frames for
// hidden windows, and captures are often taken from one.
function ManualClock() {
	useEffect(() => {
		const id = window.setInterval(() => advance(performance.now()), 100);
		return () => window.clearInterval(id);
	}, []);
	return null;
}

// Capture mode only: grabs the frame right after the final composite, in the same task, so it
// works without preserveDrawingBuffer. A positive priority takes over rendering, so it renders
// the frame itself.
function Capture() {
	useFrame(({ gl, scene, camera }) => {
		gl.render(scene, camera);
		const request = journey.capture;
		if (!request) return;
		journey.capture = null;
		gl.domElement.toBlob(request, "image/jpeg", 0.9);
	}, 2);
	return null;
}

// Mounted inside the Suspense boundary, so it runs once the model has loaded.
function Ready({ onReady }) {
	useEffect(() => {
		onReady?.();
	}, [onReady]);
	return null;
}
