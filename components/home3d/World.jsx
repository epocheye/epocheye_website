"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

import { ThemeContext } from "@/components/preorder/theme";
import { Dust, Gate, GridFloor } from "@/components/preorder/Holo";
import { PALETTE as P } from "./theme";
import { CORRIDOR_END, STATIONS, isPortrait, smoothstep, stationOffset } from "./stations";
import { ManifestoScene, WhereScene } from "./SceneOpen";
import { CollectionScene, FieldScene, HowScene, StackScene } from "./SceneMiddle";
import { AtlasScene, NetworkScene, TeamScene } from "./SceneClose";

const camA = new THREE.Vector3();
const camB = new THREE.Vector3();
const lookA = new THREE.Vector3();
const lookB = new THREE.Vector3();
const look = new THREE.Vector3();
const dir = new THREE.Vector3();

/** Where the camera rests for station i, pulled back until its frame fits the screen. */
function stationCamera(i, aspect, fov, outCam, outLook) {
	const s = STATIONS[i];
	const portrait = isPortrait(aspect);
	const [w, h] = portrait ? s.framePortrait : s.frame;
	const t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
	const dist = Math.max(w / (2 * t * aspect), h / (2 * t), 6);
	outLook.set(...(portrait && s.lookPortrait ? s.lookPortrait : s.look));
	dir.set(...s.from).normalize();
	outCam.copy(outLook).addScaledVector(dir, dist);
}

/** Holds at each station and flies between them, rising to clear what's in the way. */
function Rig({ progress, reduced }) {
	useFrame((state, delta) => {
		const { camera, size } = state;
		const aspect = size.width / size.height;
		const portrait = isPortrait(aspect);
		const fov = portrait ? 58 : 42;
		if (camera.fov !== fov) {
			camera.fov = fov;
			camera.updateProjectionMatrix();
		}
		const p = progress.get() * (STATIONS.length - 1);
		const i = Math.min(STATIONS.length - 2, Math.floor(p));
		const e = smoothstep(0.12, 0.88, p - i);
		stationCamera(i, aspect, fov, camA, lookA);
		stationCamera(i + 1, aspect, fov, camB, lookB);
		const lift = STATIONS[i].lift ?? 1.2;
		const arc = Math.sin(e * Math.PI);
		const tx = THREE.MathUtils.lerp(camA.x, camB.x, e) + state.pointer.x * 0.5;
		const ty = THREE.MathUtils.lerp(camA.y, camB.y, e) + arc * lift + state.pointer.y * 0.25;
		const tz = THREE.MathUtils.lerp(camA.z, camB.z, e);
		look.lerpVectors(lookA, lookB, e);
		const k = reduced ? 20 : 4;
		camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, k, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, k, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, k, delta);
		camera.lookAt(look);
		// A slight bank mid-flight sells the speed.
		camera.rotateZ(arc * (i % 2 ? 0.035 : -0.035));
	});
	return null;
}

/** Draws a scene only while the camera is at it or flying to it. */
function Near({ progress, station, children }) {
	const ref = useRef(null);
	useFrame(() => {
		if (ref.current) ref.current.visible = Math.abs(stationOffset(progress.get(), station)) < 0.85;
	});
	return <group ref={ref}>{children}</group>;
}

/** Shown only as the camera flies through it, so a gate never stands in front of a scene. */
function Passing({ progress, at, children }) {
	const ref = useRef(null);
	useFrame(() => {
		if (ref.current) ref.current.visible = Math.abs(progress.get() * (STATIONS.length - 1) - at) < 0.4;
	});
	return <group ref={ref}>{children}</group>;
}

const SCENES = [ManifestoScene, WhereScene, StackScene, CollectionScene, FieldScene, HowScene, AtlasScene, NetworkScene, TeamScene];

function Scene({ progress, intro, reduced }) {
	const aspect = useThree((s) => s.size.width / s.size.height);
	const portrait = isPortrait(aspect);
	const [small] = useState(() => window.matchMedia("(max-width: 767px)").matches);
	const length = -CORRIDOR_END + 80;
	return (
		<>
			<color attach="background" args={[P.bg]} />
			<fog attach="fog" args={[P.bg, 26, 70]} />
			<hemisphereLight args={[P.hemiSky, P.hemiGround, 0.9]} />
			<directionalLight position={[6, 12, 9]} intensity={P.sunIntensity} color={P.sun} />
			<ambientLight intensity={0.25} />
			<GridFloor z={CORRIDOR_END / 2} length={length} />
			<Dust count={small ? 160 : 360} color={P.text} center={[0, 6, CORRIDOR_END / 2]} area={[30, 14, length]} />
			<Dust count={small ? 50 : 120} color={P.accent} seed={2} center={[0, 6, CORRIDOR_END / 2]} area={[30, 14, length]} />
			{STATIONS.slice(1).map((s, i) => (
				<Passing key={s.id} progress={progress} at={i + 0.5}>
					<Gate z={s.look[2] + 18} />
				</Passing>
			))}
			{/* Text and photos load lazily: suspend each scene on its own, never the room. */}
			{SCENES.map((S, i) => (
				<Suspense key={STATIONS[i].id} fallback={null}>
					<Near progress={progress} station={i}>
						<S portrait={portrait} progress={progress} intro={intro} />
					</Near>
				</Suspense>
			))}
			<Rig progress={progress} reduced={reduced} />
			<EffectComposer multisampling={0}>
				<Bloom intensity={P.bloom} luminanceThreshold={P.bloomThreshold} luminanceSmoothing={0.3} mipmapBlur />
				<Noise opacity={0.035} />
				<Vignette eskil={false} offset={0.3} darkness={0.65} />
			</EffectComposer>
		</>
	);
}

export default function World({ progress, intro, reduced, active }) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			frameloop={active ? "always" : "never"}
			camera={{ position: [0, 6, 26], fov: 42, near: 0.1, far: 160 }}
			gl={{ antialias: false, powerPreference: "high-performance" }}
			// Vertical swipes scroll the page.
			style={{ touchAction: "pan-y" }}
			onPointerMissed={() => {
				document.body.style.cursor = "";
			}}>
			<ThemeContext.Provider value={P}>
				<Scene progress={progress} intro={intro} reduced={reduced} />
			</ThemeContext.Provider>
		</Canvas>
	);
}
