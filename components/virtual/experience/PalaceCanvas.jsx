"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor, Sky, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

import { STOPS, TIERS, planToWorld, tierOf } from "@/lib/virtual/journey";
import { journey } from "./store";

const MODEL_URL = "/virtual/palace.glb";
const HALL_FILL = planToWorld([0.5, 10, 3.2]);
const SUN_AZIMUTH = (110 * Math.PI) / 180; // afternoon sun from the west, behind the visitor at the front

let ktx2 = null;
function withKtx2(gl) {
	return (loader) => {
		if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath("/virtual/basis/").detectSupport(gl);
		loader.setKTX2Loader(ktx2);
	};
}

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const HOLD = 0.5; // share of each chapter the camera stays at its stop before moving on

// Where the camera should be for chapter position t, plus how black the cut overlay is.
function sample(t, elapsed, out) {
	const last = STOPS.length - 1;
	const i = Math.min(Math.floor(t), last);
	const f = i === last ? 0 : t - i;
	const a = STOPS[i];
	const b = STOPS[Math.min(i + 1, last)];
	const k = f < HOLD ? 0 : easeInOut((f - HOLD) / (1 - HOLD));

	const pa = stopPosition(a, elapsed, out.pa);
	const pb = stopPosition(b, elapsed, out.pb);
	out.ta.fromArray(a.target);
	out.tb.fromArray(b.target);

	if (b.cut) {
		const first = k < 0.5;
		out.position.copy(first ? pa : pb);
		out.target.copy(first ? out.ta : out.tb);
		out.fade = k === 0 ? 0 : 1 - Math.abs(k - 0.5) * 2;
		out.snap = !first;
	} else {
		out.position.lerpVectors(pa, pb, k);
		out.target.lerpVectors(out.ta, out.tb, k);
		out.fade = 0;
		out.snap = false;
	}
	out.sunElevation = a.sun + (b.sun - a.sun) * k;
	return out;
}

function stopPosition(stop, elapsed, v) {
	if (!stop.orbit) return v.fromArray(stop.position);
	const { centre, radius, height, speed, phase } = stop.orbit;
	const angle = phase + (journey.reducedMotion ? 0 : elapsed * speed);
	return v.set(centre[0] + Math.cos(angle) * radius, centre[1] + height, centre[2] + Math.sin(angle) * radius);
}

function sunVector(elevationDeg, v) {
	const el = (elevationDeg * Math.PI) / 180;
	return v.set(Math.cos(el) * Math.cos(SUN_AZIMUTH), Math.sin(el), Math.cos(el) * Math.sin(SUN_AZIMUTH));
}

function makeRigState() {
	return {
		pa: new THREE.Vector3(),
		pb: new THREE.Vector3(),
		ta: new THREE.Vector3(),
		tb: new THREE.Vector3(),
		position: new THREE.Vector3(),
		target: new THREE.Vector3(),
		look: new THREE.Vector3(),
		sun: new THREE.Vector3(),
		fade: 0,
		snap: false,
		lastSnap: null,
		aspect: 0,
	};
}

// Wide on phones held upright, narrower on desktop: hold the horizontal view near 80 degrees.
function fitLens(camera, aspect) {
	const hFov = (80 * Math.PI) / 180;
	const vFov = (2 * Math.atan(Math.tan(hFov / 2) / aspect) * 180) / Math.PI;
	camera.fov = THREE.MathUtils.clamp(vFov, 48, 78);
	camera.near = 0.2;
	camera.far = 600;
	camera.updateProjectionMatrix();
}

function CameraRig({ skyRef, sunRef }) {
	const rig = useRef(null);

	useFrame((frame, dt) => {
		if (!rig.current) rig.current = makeRigState();
		const state = rig.current;
		const { camera, size } = frame;

		const aspect = size.width / Math.max(1, size.height);
		if (aspect !== state.aspect) {
			state.aspect = aspect;
			fitLens(camera, aspect);
		}

		const s = sample(journey.t, frame.clock.elapsedTime, state);
		const k = 1 - Math.exp(-Math.min(dt, 0.1) * 3.5);

		// Snap on the first frame and across a cut; otherwise glide.
		if (state.lastSnap === null || s.snap !== state.lastSnap) {
			camera.position.copy(s.position);
			state.look.copy(s.target);
		} else {
			camera.position.lerp(s.position, k);
			state.look.lerp(s.target, k);
		}
		state.lastSnap = s.snap;

		// A slight look-around that follows the pointer, so standing still still feels alive.
		const sway = journey.reducedMotion ? 0 : 0.6;
		camera.lookAt(state.look.x + journey.pointerX * sway, state.look.y - journey.pointerY * sway * 0.5, state.look.z);

		if (journey.fadeEl) journey.fadeEl.style.opacity = String(s.fade);

		// Thin the haze as the camera climbs, so the aerials stay clear and the lawn keeps depth.
		const fog = frame.scene.fog;
		if (fog) {
			const high = THREE.MathUtils.clamp(camera.position.y / 40, 0, 1);
			fog.near = 50 + high * 60;
			fog.far = 230 + high * 260;
		}

		sunVector(s.sunElevation, state.sun);
		if (skyRef.current) skyRef.current.material.uniforms.sunPosition.value.copy(state.sun);
		if (sunRef.current) {
			sunRef.current.position.copy(state.sun).multiplyScalar(80);
			const warm = THREE.MathUtils.clamp(1 - s.sunElevation / 18, 0, 1);
			sunRef.current.color.setHSL(0.09, 0.35 + warm * 0.45, 0.85 - warm * 0.25);
			sunRef.current.intensity = 1.2 + (1 - warm) * 1.6;
		}
	});
	return null;
}

function Palace({ evidence }) {
	const gl = useThree((s) => s.gl);
	const { scene } = useGLTF(MODEL_URL, false, true, withKtx2(gl));

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
			if (!obj.userData.original) obj.userData.original = obj.material;
			const original = obj.userData.original;
			obj.material = evidence ? tierMaterials[tierOf(original.name)] : original;
		});
	}, [scene, evidence, tierMaterials]);

	return <primitive object={scene} />;
}

export default function PalaceCanvas({ evidence, onReady, onLost, effects }) {
	const skyRef = useRef(null);
	const sunRef = useRef(null);

	return (
		<Canvas
			className="!fixed inset-0"
			dpr={[1, 1.75]}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			camera={{ position: [0, 40, 80], fov: 60 }}
			onCreated={({ gl }) => {
				gl.toneMapping = THREE.ACESFilmicToneMapping;
				gl.toneMappingExposure = 0.9;
				// Phones can drop the GPU context under memory pressure; fall back to a still.
				gl.domElement.addEventListener("webglcontextlost", (e) => {
					e.preventDefault();
					onLost?.();
				});
			}}>
			<PerformanceMonitor />
			<AdaptiveDpr pixelated={false} />
			<color attach="background" args={["#c8b08a"]} />
			{/* Warm haze: hides the edge of the modelled site and gives depth to the aerials. */}
			<fog attach="fog" args={["#c6ad86", 50, 230]} />
			<Sky ref={skyRef} distance={4500} turbidity={8} rayleigh={2.2} mieCoefficient={0.008} mieDirectionalG={0.85} />
			<mesh rotation-x={-Math.PI / 2} position-y={-1.2} receiveShadow={false}>
				<circleGeometry args={[1500, 48]} />
				<meshStandardMaterial color="#6b5f44" roughness={1} />
			</mesh>
			<hemisphereLight args={["#fff1d6", "#8a6a48", 0.9]} />
			{/* Fill inside the hall: the sun alone never reaches the galleries or the painted ceiling. */}
			<pointLight position={HALL_FILL} intensity={60} distance={30} decay={2} color="#ffd9a8" />
			<directionalLight ref={sunRef} intensity={2.4} />
			<Environment resolution={64} frames={1}>
				<Lightformer intensity={1.2} color="#ffe2b8" position={[0, 6, -12]} scale={[24, 8, 1]} />
				<Lightformer intensity={0.6} color="#bcd4ff" position={[0, 12, 12]} scale={[24, 8, 1]} />
			</Environment>
			<Suspense fallback={null}>
				<Palace evidence={evidence} />
				<Ready onReady={onReady} />
			</Suspense>
			<CameraRig skyRef={skyRef} sunRef={sunRef} />
			{effects ? (
				<EffectComposer multisampling={0}>
					<Bloom intensity={0.25} luminanceThreshold={0.85} mipmapBlur />
					<Vignette offset={0.25} darkness={0.55} />
				</EffectComposer>
			) : null}
		</Canvas>
	);
}

// Mounted inside the Suspense boundary, so it runs once the model has loaded.
function Ready({ onReady }) {
	useEffect(() => {
		onReady?.();
	}, [onReady]);
	return null;
}
