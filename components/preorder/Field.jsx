"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { COLORS } from "./theme";

const Z_FRONT = 16;
const Z_BACK = -142;

// Height field shared by every column: travelling ribbons down the corridor, a
// ripple ringing out from wherever the pointer lands, and a tall beacon at the
// hero. The leaderboard's footprint is flattened so its pillars stand clear.
const HEIGHT_GLSL = /* glsl */ `
	uniform float uTime;
	uniform vec2 uPointer;
	uniform float uEnergy;
	float fieldHeight(vec2 g) {
		float side = abs(g.x);
		float ribbons = sin(g.y * 0.22 + uTime * 1.1) * 0.5 + cos(g.x * 0.31 - uTime * 0.6) * 0.5;
		float r = length(g - uPointer);
		float ripple = max(0.0, sin(r * 1.5 - uTime * 3.6)) * exp(-r * 0.24) * (0.9 + uEnergy);
		float hero = exp(-dot(g, g) * 0.02);
		float beacon = exp(-r * r * 0.11) * (1.2 + uEnergy * 1.6) * (0.5 + hero);
		float h = 0.1 + max(0.0, ribbons * 0.45 + 0.25) + ripple + beacon + hero * 1.2;
		// Walls rise toward the corridor edges so the flight reads as a canyon.
		h += smoothstep(9.0, 15.0, side) * (1.2 + sin(g.y * 0.4 + uTime) * 0.6);
		// Flatten the leaderboard platform.
		float board = (1.0 - smoothstep(9.5, 11.0, side)) * (1.0 - smoothstep(6.5, 8.0, abs(g.y + 64.0)));
		h = mix(h, 0.06, board);
		return h;
	}
`;

export function Columns({ cols, spacing, reduced }) {
	const mesh = useRef(null);
	const rows = Math.floor((Z_FRONT - Z_BACK) / spacing);
	const count = cols * rows;
	const geometry = useMemo(() => new THREE.BoxGeometry(spacing * 0.64, 1, spacing * 0.64).translate(0, 0.5, 0), [spacing]);
	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uPointer: { value: new THREE.Vector2(0, 0) },
			uEnergy: { value: 0 },
			uInk: { value: new THREE.Color(COLORS.ink) },
			uLime: { value: new THREE.Color(COLORS.lime) },
			uViolet: { value: new THREE.Color(COLORS.violet) },
		}),
		[]
	);

	useLayoutEffect(() => {
		const m = mesh.current;
		if (!m) return;
		const o = new THREE.Object3D();
		const half = ((cols - 1) * spacing) / 2;
		let i = 0;
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				o.position.set(c * spacing - half, 0, Z_FRONT - r * spacing);
				o.updateMatrix();
				m.setMatrixAt(i, o.matrix);
				i += 1;
			}
		}
		m.instanceMatrix.needsUpdate = true;
	}, [cols, rows, spacing]);

	useFrame((state) => {
		const m = mesh.current;
		if (!m) return;
		m.material.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
	});

	return (
		<instancedMesh
			ref={mesh}
			key={count}
			args={[geometry, undefined, count]}
			frustumCulled={false}
			name="columns">
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
					uniform vec3 uLime;
					uniform vec3 uViolet;
					varying float vTop;
					varying float vH;
					varying float vDepth;
					varying float vSide;
					void main() {
						// Lime and violet are complements: blending them goes grey, so the
						// cap switches between them over a narrow band instead.
						float heat = smoothstep(1.4, 1.9, vH);
						vec3 body = mix(uInk * 1.4, uViolet * 0.42, pow(vTop, 1.6));
						vec3 cap = mix(uViolet * 0.85, uLime * 1.4, heat);
						vec3 col = mix(cap, body, vSide);
						col += uLime * pow(vTop, 10.0) * heat * vSide * 0.7;
						float fog = smoothstep(10.0, 34.0, vDepth);
						gl_FragColor = vec4(mix(col, uInk, fog), 1.0);
					}
				`
				}
			/>
		</instancedMesh>
	);
}

export function Floor({ reduced }) {
	const mesh = useRef(null);
	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uLime: { value: new THREE.Color(COLORS.lime) },
			uViolet: { value: new THREE.Color(COLORS.violet) },
		}),
		[]
	);
	useFrame((state) => {
		if (mesh.current) mesh.current.material.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
	});
	return (
		<mesh ref={mesh} rotation-x={-Math.PI / 2} position={[0, -0.001, (Z_FRONT + Z_BACK) / 2]}>
			<planeGeometry args={[70, Z_FRONT - Z_BACK + 40, 1, 1]} />
			<shaderMaterial
				transparent
				depthWrite={false}
				uniforms={uniforms}
				vertexShader={
					/* glsl */ `
					varying vec2 vWorld;
					varying float vDepth;
					void main() {
						vec4 w = modelMatrix * vec4(position, 1.0);
						vWorld = w.xz;
						vec4 mv = viewMatrix * w;
						vDepth = -mv.z;
						gl_Position = projectionMatrix * mv;
					}
				`
				}
				fragmentShader={
					/* glsl */ `
					uniform float uTime;
					uniform vec3 uLime;
					uniform vec3 uViolet;
					varying vec2 vWorld;
					varying float vDepth;
					float gridLine(vec2 p, float size, float width) {
						vec2 c = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
						return 1.0 - min(min(c.x, c.y) / width, 1.0);
					}
					void main() {
						float fine = gridLine(vWorld, 0.66, 1.0);
						float major = gridLine(vWorld, 3.96, 1.4);
						float pulse = smoothstep(0.92, 1.0, 1.0 - abs(fract(-vWorld.y * 0.02 - uTime * 0.12) - 0.5) * 2.0);
						float fade = 1.0 - smoothstep(12.0, 38.0, vDepth);
						vec3 col = uViolet * fine * 0.55 + (pulse > 0.5 ? uLime * 1.4 : uViolet * 1.2) * major;
						float a = (fine * 0.35 + major * (0.7 + pulse)) * fade;
						gl_FragColor = vec4(col, a);
					}
				`
				}
			/>
		</mesh>
	);
}

/** A wireframe gateway the camera flies through on the way into a station. */
export function Gate({ z, width = 22, height = 12, color = COLORS.violet }) {
	const t = 0.06;
	const bars = [
		[0, height, width, t],
		[-width / 2, height / 2, t, height],
		[width / 2, height / 2, t, height],
	];
	return (
		<group position={[0, 0, z]}>
			{bars.map(([x, y, w, h], i) => (
				<mesh key={i} position={[x, y, 0]}>
					<boxGeometry args={[w, h, t]} />
					<meshBasicMaterial color={color} toneMapped={false} />
				</mesh>
			))}
			{[-1, 1].map((s) => (
				<mesh key={s} position={[s * (width / 2 - 0.6), height - 0.02, 0]}>
					<boxGeometry args={[1.2, 0.12, 0.12]} />
					<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
				</mesh>
			))}
		</group>
	);
}

/** Floating wireframe iris: the "eye" in Epocheye. */
export function Iris({ position, scale = 1 }) {
	const group = useRef(null);
	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		const t = state.clock.elapsedTime;
		g.rotation.y = t * 0.25;
		g.children[0].rotation.x = t * 0.4;
		g.children[1].rotation.z = -t * 0.3;
		g.position.y = position[1] + Math.sin(t * 0.8) * 0.18;
	});
	return (
		<group ref={group} position={position} scale={scale}>
			<mesh>
				<torusGeometry args={[1.35, 0.014, 8, 160]} />
				<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
			</mesh>
			<mesh rotation-x={Math.PI / 2}>
				<torusGeometry args={[1.0, 0.012, 8, 140]} />
				<meshBasicMaterial color={COLORS.violetLight} toneMapped={false} />
			</mesh>
			<mesh>
				<icosahedronGeometry args={[0.42, 1]} />
				<meshBasicMaterial color={COLORS.violet} wireframe toneMapped={false} />
			</mesh>
		</group>
	);
}
