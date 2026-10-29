"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

import { formatPrice } from "@/lib/preorder/price";
import { ThemeContext, usePalette } from "./theme";
import { STATIONS, isPortrait, smoothstep, stationDistance } from "./stations";
import { Dust, GridFloor } from "./Holo";
import { AppStation, Gates, HeroStation, HowStation } from "./Stations3D";
import Towers from "./Towers";
import Ticket from "./Ticket";

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

/** Draws a station only while the camera is at it or flying to it, so far ones never ghost through the fog. */
function Near({ progress, station, children }) {
	const ref = useRef(null);
	useFrame(() => {
		if (ref.current) ref.current.visible = stationDistance(progress.get(), station) < 0.95;
	});
	return <group ref={ref}>{children}</group>;
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
			<hemisphereLight args={[t.hemiSky, t.hemiGround, t.mode === "light" ? 1.2 : 0.8]} />
			<directionalLight position={[6, 12, 9]} intensity={t.sunIntensity} color={t.sun} />
			<ambientLight intensity={t.mode === "light" ? 0.35 : 0.2} />
			<GridFloor />
			<Dust count={small ? 140 : 300} color={t.ochre} />
			<Dust count={small ? 50 : 110} color={t.accent} seed={2} />
			<Gates />

			{/* Text fetches its font: suspend the stations, never the room. */}
			<Suspense fallback={null}>
				<HeroStation
					portrait={portrait}
					progress={progress}
					intro={intro}
					active={props.heroActive}
					priceLabel={formatPrice(props.price)}
					onBuy={props.onBuy}
				/>
			</Suspense>
			<Suspense fallback={null}>
				<Near progress={progress} station={1}>
					<HowStation portrait={portrait} progress={progress} />
				</Near>
				<Near progress={progress} station={2}>
					<Towers
						z={STATIONS[2].look[2]}
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
				</Near>
				<Near progress={progress} station={3}>
					<Ticket
						position={[0, STATIONS[3].look[1], STATIONS[3].look[2]]}
						scale={portrait ? 0.92 : 1}
						visible={props.formVisible}
						sites={props.sites}
						counts={props.counts}
						price={props.price}
						selected={props.selected}
						onSelect={props.onSelect}
						onDone={props.onDone}
						onSeeBrick={props.onSeeBrick}
					/>
				</Near>
				<Near progress={progress} station={4}>
					<AppStation portrait={portrait} />
				</Near>
			</Suspense>

			<Rig progress={progress} reduced={reduced} />
			<EffectComposer multisampling={0}>
				<Bloom intensity={t.bloom} luminanceThreshold={t.bloomThreshold} luminanceSmoothing={0.3} mipmapBlur />
				<Noise opacity={0.03} />
				<Vignette eskil={false} offset={0.3} darkness={t.mode === "dark" ? 0.6 : 0.2} />
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
			// Vertical swipes scroll the page; horizontal drags spin the plaza.
			style={{ touchAction: "pan-y" }}
			onPointerMissed={() => props.onHover(null)}>
			<ThemeContext.Provider value={palette}>
				<Scene {...props} />
			</ThemeContext.Provider>
		</Canvas>
	);
}
