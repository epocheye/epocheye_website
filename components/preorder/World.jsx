"use client";

import { Suspense, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

import { ThemeContext, usePalette } from "./theme";
import { STATIONS, isPortrait, smoothstep } from "./stations";
import { GridFloor } from "./Holo";
import { AppStation, BoardStation, FormStation, Gates, HeroStation, HowStation } from "./Stations3D";

const camA = new THREE.Vector3();
const camB = new THREE.Vector3();
const lookA = new THREE.Vector3();
const lookB = new THREE.Vector3();
const look = new THREE.Vector3();
const dir = new THREE.Vector3();
const caOffset = new THREE.Vector2(0.0007, 0.0005);

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
		// Hold near each station, fly in between, rising to clear what's in the way.
		const p = progress.get() * (STATIONS.length - 1);
		const i = Math.min(STATIONS.length - 2, Math.floor(p));
		const e = smoothstep(0.12, 0.88, p - i);
		stationCamera(i, aspect, fov, camA, lookA);
		stationCamera(i + 1, aspect, fov, camB, lookB);
		const from = STATIONS[i];
		const lift = (portrait ? from.liftPortrait : undefined) ?? from.lift ?? 0.8;
		const arc = Math.sin(e * Math.PI);
		const tx = THREE.MathUtils.lerp(camA.x, camB.x, e) + state.pointer.x * 0.6;
		const ty = THREE.MathUtils.lerp(camA.y, camB.y, e) + arc * lift + state.pointer.y * 0.3;
		const tz = THREE.MathUtils.lerp(camA.z, camB.z, e);
		look.lerpVectors(lookA, lookB, e);

		const k = reduced ? 20 : 4;
		camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, k, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, k, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, k, delta);
		camera.lookAt(look);
		// A slight bank mid-flight sells the speed.
		camera.rotateZ(arc * (i % 2 ? 0.04 : -0.04));
	});
	return null;
}

function Scene(props) {
	const { progress, reduced, intro } = props;
	const t = usePalette();
	const aspect = useThree((s) => s.size.width / s.size.height);
	const portrait = isPortrait(aspect);
	const [small] = useState(() => window.matchMedia("(max-width: 767px)").matches);

	return (
		<>
			<color attach="background" args={[t.bg]} />
			<fog attach="fog" args={[t.bg, 24, 64]} />
			<GridFloor />
			<Sparkles count={small ? 120 : 280} scale={[30, 14, 160]} position={[0, 6, -66]} size={2.4} speed={0.35} color={t.blue} opacity={0.8} />
			<Sparkles count={small ? 40 : 90} scale={[30, 14, 160]} position={[0, 6, -66]} size={3} speed={0.5} color={t.amber} opacity={0.8} />
			<Gates />

			{/* Text fetches its font: suspend the stations, never the room. */}
			<Suspense fallback={null}>
				<HeroStation portrait={portrait} progress={progress} intro={intro} />
			</Suspense>
			<Suspense fallback={null}>
				<HowStation portrait={portrait} progress={progress} />
				<BoardStation
					portrait={portrait}
					progress={progress}
					sites={props.sites}
					counts={props.counts}
					selected={props.selected}
					hovered={props.hovered}
					onHover={props.onHover}
					onSelect={props.onPick}
					flash={props.flash}
				/>
				<FormStation
					portrait={portrait}
					visible={props.formVisible}
					sites={props.sites}
					selected={props.selected}
					onSelect={props.onSelect}
					onDone={props.onDone}
				/>
				<AppStation portrait={portrait} />
			</Suspense>

			<Rig progress={progress} reduced={reduced} />
			<EffectComposer multisampling={0}>
				<Bloom intensity={t.bloom} luminanceThreshold={t.bloomThreshold} luminanceSmoothing={0.3} mipmapBlur />
				<ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
				<Noise opacity={t.mode === "dark" ? 0.05 : 0.03} />
				<Vignette eskil={false} offset={0.25} darkness={t.mode === "dark" ? 0.8 : 0.25} />
			</EffectComposer>
		</>
	);
}

export default function World({ palette, ...props }) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			camera={{ position: [0, 6, 26], fov: 42, near: 0.1, far: 160 }}
			gl={{ antialias: false, powerPreference: "high-performance" }}
			onPointerMissed={() => props.onHover(null)}>
			<ThemeContext.Provider value={palette}>
				<Scene {...props} />
			</ThemeContext.Provider>
		</Canvas>
	);
}
