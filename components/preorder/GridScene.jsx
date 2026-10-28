"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

const COLS = 46;
const COLS_SMALL = 30; // phones: fewer columns, same footprint feel
const SPACING = 0.66;
const COLUMN = 0.42;

const INK = new THREE.Color("#060606");
const SIGNAL = new THREE.Color("#ccff00");
const BONE = new THREE.Color("#f2efe6");

// Shared temporaries for the per-frame camera / pointer math (never rendered).
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const raycaster = new THREE.Raycaster();
const hit = new THREE.Vector3();
const lookAt = new THREE.Vector3();

// Height field shared by the columns: two slow travelling waves, a ripple that
// rings out from the pointer, and a tall "beacon" swell around it. Edge falloff
// keeps the field's border from reading as a hard square.
const HEIGHT_GLSL = /* glsl */ `
	uniform float uTime;
	uniform vec2 uPointer;
	uniform float uEnergy;
	float fieldHeight(vec2 g) {
		float d = length(g);
		float w = sin(g.x * 0.34 + uTime * 0.8) * 0.5 + cos(g.y * 0.29 - uTime * 0.62) * 0.5;
		float r = length(g - uPointer);
		float ripple = sin(r * 1.5 - uTime * 3.6) * exp(-r * 0.24);
		float beacon = exp(-r * r * 0.11) * (2.2 + uEnergy * 2.0);
		float h = 0.12 + max(0.0, w * 0.55 + 0.35) + max(0.0, ripple) * (0.9 + uEnergy) + beacon;
		return h * smoothstep(17.0, 4.0, d);
	}
`;

function Columns({ cols }) {
	const mesh = useRef(null);
	// Unit box with its base on y=0 so the shader can stretch it upward.
	const geometry = useMemo(() => new THREE.BoxGeometry(COLUMN, 1, COLUMN).translate(0, 0.5, 0), []);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uPointer: { value: new THREE.Vector2(0, 0) },
			uEnergy: { value: 0 },
			uInk: { value: INK },
			uSignal: { value: SIGNAL },
			uBone: { value: BONE },
		}),
		[]
	);

	useLayoutEffect(() => {
		const m = mesh.current;
		if (!m) return;
		const o = new THREE.Object3D();
		const half = ((cols - 1) * SPACING) / 2;
		let i = 0;
		for (let x = 0; x < cols; x += 1) {
			for (let z = 0; z < cols; z += 1) {
				o.position.set(x * SPACING - half, 0, z * SPACING - half);
				o.updateMatrix();
				m.setMatrixAt(i, o.matrix);
				i += 1;
			}
		}
		m.instanceMatrix.needsUpdate = true;
	}, [cols]);

	return (
		<instancedMesh ref={mesh} key={cols} args={[geometry, undefined, cols * cols]} frustumCulled={false} name="columns">
			<shaderMaterial
				uniforms={uniforms}
				vertexShader={
					HEIGHT_GLSL +
					/* glsl */ `
					varying float vTop;
					varying float vH;
					varying float vDepth;
					varying float vSide;
					void main() {
						vec2 g = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
						float h = fieldHeight(g);
						vec3 p = position;
						p.y *= h;
						vTop = position.y;
						vH = h;
						vSide = 1.0 - abs(normal.y);
						vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
						vDepth = -mv.z;
						gl_Position = projectionMatrix * mv;
					}
				`
				}
				fragmentShader={
					/* glsl */ `
					uniform vec3 uInk;
					uniform vec3 uSignal;
					uniform vec3 uBone;
					varying float vTop;
					varying float vH;
					varying float vDepth;
					varying float vSide;
					void main() {
						float heat = clamp(vH / 3.4, 0.0, 1.0);
						vec3 body = mix(uInk * 1.8, uBone * 0.09, vTop);
						vec3 cap = mix(uBone * 0.35, uSignal * 1.6, heat);
						vec3 col = mix(cap, body, vSide);
						col += uSignal * pow(vTop, 6.0) * heat * 0.9 * vSide;
						float fog = smoothstep(9.0, 30.0, vDepth);
						gl_FragColor = vec4(mix(col, uInk, fog), 1.0);
					}
				`
				}
			/>
		</instancedMesh>
	);
}

function Floor() {
	const uniforms = useMemo(
		() => ({ uTime: { value: 0 }, uSignal: { value: SIGNAL }, uInk: { value: INK }, uSpacing: { value: SPACING } }),
		[]
	);
	return (
		<mesh rotation-x={-Math.PI / 2} position-y={-0.001} name="floor">
			<planeGeometry args={[90, 90, 1, 1]} />
			<shaderMaterial
				transparent
				depthWrite={false}
				uniforms={uniforms}
				vertexShader={
					/* glsl */ `
					varying vec2 vPos;
					varying float vDepth;
					void main() {
						vPos = position.xy;
						vec4 mv = modelViewMatrix * vec4(position, 1.0);
						vDepth = -mv.z;
						gl_Position = projectionMatrix * mv;
					}
				`
				}
				fragmentShader={
					/* glsl */ `
					uniform float uTime;
					uniform float uSpacing;
					uniform vec3 uSignal;
					varying vec2 vPos;
					varying float vDepth;
					float gridLine(vec2 p, float size, float width) {
						vec2 c = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
						return 1.0 - min(min(c.x, c.y) / width, 1.0);
					}
					void main() {
						vec2 p = vPos + vec2(0.0, uTime * 0.35);
						float fine = gridLine(p + uSpacing * 0.5, uSpacing, 1.0) * 0.25;
						float major = gridLine(p + uSpacing * 0.5, uSpacing * 6.0, 1.4) * 0.7;
						float d = length(vPos);
						float fade = smoothstep(42.0, 6.0, d) * (1.0 - smoothstep(10.0, 36.0, vDepth));
						float scan = smoothstep(0.0, 1.0, 1.0 - abs(fract(d * 0.05 - uTime * 0.08) - 0.5) * 8.0) * 0.6;
						float a = (fine + major * (0.6 + scan)) * fade;
						gl_FragColor = vec4(uSignal, a);
					}
				`
				}
			/>
		</mesh>
	);
}

// A floating wireframe iris above the field: the "eye" in Epocheye.
function Iris() {
	const group = useRef(null);
	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		const t = state.clock.elapsedTime;
		g.rotation.y = t * 0.25;
		g.children[0].rotation.x = t * 0.4;
		g.children[1].rotation.z = -t * 0.3;
		g.position.y = 4.4 + Math.sin(t * 0.8) * 0.18;
	});
	return (
		<group ref={group} position={[0, 4.4, 0]}>
			<mesh>
				<torusGeometry args={[1.35, 0.012, 8, 160]} />
				<meshBasicMaterial color={SIGNAL} toneMapped={false} />
			</mesh>
			<mesh rotation-x={Math.PI / 2}>
				<torusGeometry args={[1.0, 0.01, 8, 140]} />
				<meshBasicMaterial color={BONE} toneMapped={false} transparent opacity={0.7} />
			</mesh>
			<mesh>
				<icosahedronGeometry args={[0.42, 1]} />
				<meshBasicMaterial color={SIGNAL} wireframe toneMapped={false} />
			</mesh>
		</group>
	);
}

/**
 * Drives every uniform and the camera from one frame callback. `progress` is a
 * motion value (0 → 1 across the hero scroll); the camera dives from a high
 * establishing shot down into the field as it rises.
 */
function Rig({ progress, reduced }) {
	const pointer = useRef(new THREE.Vector2(0, 0));
	const energy = useRef(0);

	useFrame((state, delta) => {
		const { scene, camera, clock } = state;
		const t = reduced ? 0 : clock.elapsedTime;
		const p = progress?.get?.() ?? 0;

		// Pointer → point on the floor, eased so the ripple glides.
		raycaster.setFromCamera(state.pointer, camera);
		if (raycaster.ray.intersectPlane(plane, hit)) {
			pointer.current.x = THREE.MathUtils.damp(pointer.current.x, hit.x, 4, delta);
			pointer.current.y = THREE.MathUtils.damp(pointer.current.y, hit.z, 4, delta);
		}
		const reach = Math.min(1, Math.hypot(state.pointer.x, state.pointer.y));
		energy.current = THREE.MathUtils.damp(energy.current, reduced ? 0 : reach * 0.6 + p * 0.8, 2.5, delta);

		const cols = scene.getObjectByName("columns");
		const floor = scene.getObjectByName("floor");
		if (cols) {
			const u = cols.material.uniforms;
			u.uTime.value = t;
			u.uPointer.value.copy(pointer.current);
			u.uEnergy.value = energy.current;
		}
		if (floor) floor.material.uniforms.uTime.value = t;

		// Establishing shot → low skim across the column tops, arcing to one side
		// and banking slightly. Pointer adds a little parallax.
		const e = 1 - Math.pow(1 - p, 3);
		const tx = Math.sin(e * Math.PI) * 3.2 + state.pointer.x * 1.4;
		const ty = THREE.MathUtils.lerp(10.5, 3.6, e) + state.pointer.y * 0.6;
		const tz = THREE.MathUtils.lerp(17, 7.5, e);
		camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 3, delta);
		camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 3, delta);
		camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 3, delta);
		lookAt.set(0, THREE.MathUtils.lerp(1.2, 2.2, e), THREE.MathUtils.lerp(0, -2, e));
		camera.lookAt(lookAt);
		camera.rotateZ(Math.sin(e * Math.PI) * -0.08);
	});

	return null;
}

export default function GridScene({ progress, eventSource, active = true, reduced = false }) {
	// Client-only module (dynamic, ssr: false), so window is always defined here.
	const [small] = useState(() => window.matchMedia("(max-width: 767px)").matches);
	return (
		<Canvas
			className="!absolute inset-0"
			dpr={small ? [1, 1.5] : [1, 1.75]}
			frameloop={active ? "always" : "never"}
			eventSource={eventSource}
			eventPrefix="client"
			camera={{ position: [0, 14, 24], fov: 42, near: 0.1, far: 120 }}
			gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
			onCreated={({ gl }) => gl.setClearColor(INK)}>
			<fog attach="fog" args={[INK, 14, 40]} />
			<Columns cols={small ? COLS_SMALL : COLS} />
			<Floor />
			<Iris />
			<Rig progress={progress} reduced={reduced} />
			<EffectComposer multisampling={0}>
				<Bloom intensity={1.15} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
				<Noise opacity={0.05} />
				<Vignette eskil={false} offset={0.2} darkness={0.85} />
			</EffectComposer>
		</Canvas>
	);
}
