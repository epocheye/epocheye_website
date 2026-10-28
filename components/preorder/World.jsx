"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

import { COLORS } from "./theme";
import { STATIONS, isPortrait, smoothstep } from "./stations";
import { Columns, Floor, Gate } from "./Field";
import { AppStation, BoardStation, FormStation, HeroStation, HowStation } from "./Stations3D";

const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const hit = new THREE.Vector3();
const camA = new THREE.Vector3();
const camB = new THREE.Vector3();
const lookA = new THREE.Vector3();
const lookB = new THREE.Vector3();
const look = new THREE.Vector3();
const dir = new THREE.Vector3();
const caOffset = new THREE.Vector2(0.0006, 0.0004);

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
	const pointer = useRef(new THREE.Vector2());
	const energy = useRef(0);

	useFrame((state, delta) => {
		const { camera, scene, size } = state;
		const aspect = size.width / size.height;
		const fov = isPortrait(aspect) ? 58 : 42;
		if (camera.fov !== fov) {
			camera.fov = fov;
			camera.updateProjectionMatrix();
		}

		// Between stations: hold near each one, glide in between, lifting over the grid.
		const p = progress.get() * (STATIONS.length - 1);
		const i = Math.min(STATIONS.length - 2, Math.floor(p));
		const e = smoothstep(0.12, 0.88, p - i);
		stationCamera(i, aspect, fov, camA, lookA);
		stationCamera(i + 1, aspect, fov, camB, lookB);
		const tx = THREE.MathUtils.lerp(camA.x, camB.x, e) + Math.sin(e * Math.PI) * (i % 2 ? -2.5 : 2.5) + state.pointer.x * 0.7;
		const ty = THREE.MathUtils.lerp(camA.y, camB.y, e) + Math.sin(e * Math.PI) * 2.4 + state.pointer.y * 0.35;
		const tz = THREE.MathUtils.lerp(camA.z, camB.z, e);
		look.lerpVectors(lookA, lookB, e);

		const k = reduced ? 20 : 4;
		camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, k, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, k, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, k, delta);
		camera.lookAt(look);
		camera.rotateZ(Math.sin(e * Math.PI) * (i % 2 ? 0.05 : -0.05));

		// Pointer → point on the floor; the column ripple follows it everywhere.
		raycaster.setFromCamera(state.pointer, camera);
		if (raycaster.ray.intersectPlane(plane, hit)) {
			pointer.current.x = THREE.MathUtils.damp(pointer.current.x, hit.x, 4, delta);
			pointer.current.y = THREE.MathUtils.damp(pointer.current.y, hit.z, 4, delta);
		}
		const moving = Math.min(1, Math.abs(tz - camera.position.z) * 0.2);
		energy.current = THREE.MathUtils.damp(energy.current, reduced ? 0 : 0.3 + moving, 2, delta);
		const cols = scene.getObjectByName("columns");
		if (cols) {
			cols.material.uniforms.uPointer.value.copy(pointer.current);
			cols.material.uniforms.uEnergy.value = energy.current;
		}
	});
	return null;
}

function Scene(props) {
	const { progress, reduced, introDelay } = props;
	const aspect = useThree((s) => s.size.width / s.size.height);
	const portrait = isPortrait(aspect);
	const [small] = useState(() => window.matchMedia("(max-width: 767px)").matches);

	return (
		<>
			<color attach="background" args={[COLORS.ink]} />
			<fog attach="fog" args={[COLORS.ink, 16, 44]} />
			<Columns cols={small ? 26 : 46} spacing={small ? 0.85 : 0.66} reduced={reduced} />
			<Floor reduced={reduced} />
			{STATIONS.slice(1).map((s) => (
				<Gate key={s.id} z={s.look[2] + 11} />
			))}
			<Sparkles count={small ? 140 : 320} scale={[30, 12, 150]} position={[0, 6, -62]} size={3} speed={0.3} color={COLORS.violetLight} opacity={0.7} />
			<Sparkles count={small ? 60 : 140} scale={[26, 10, 150]} position={[0, 5, -62]} size={2.5} speed={0.45} color={COLORS.lime} opacity={0.6} />

			{/* Text fetches its font: suspend the stations, never the grid. */}
			<Suspense fallback={null}>
				<HeroStation portrait={portrait} introDelay={introDelay} />
			</Suspense>
			<Suspense fallback={null}>
				<HowStation portrait={portrait} progress={progress} reduced={reduced} />
				<BoardStation
					portrait={portrait}
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
				<Bloom intensity={1.25} luminanceThreshold={0.5} luminanceSmoothing={0.25} mipmapBlur />
				<ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
				<Noise opacity={0.045} />
				<Vignette eskil={false} offset={0.22} darkness={0.85} />
			</EffectComposer>
		</>
	);
}

export default function World(props) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			camera={{ position: [0, 14, 24], fov: 42, near: 0.1, far: 140 }}
			gl={{ antialias: false, powerPreference: "high-performance" }}
			onPointerMissed={() => props.onHover(null)}>
			<Scene {...props} />
		</Canvas>
	);
}
