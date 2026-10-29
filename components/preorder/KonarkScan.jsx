"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

import { usePalette } from "./theme";

/* ───────────────────────── Konark point-cloud scan ───────────────────────── */

const POINTS_URL = "/preorder/konark-points.bin";

/** Baked by scripts/build-preorder-points.mjs: Int16 x,y,z, unit-normalised. */
function usePointCloud() {
	const [geometry, setGeometry] = useState(null);
	useEffect(() => {
		let alive = true;
		fetch(POINTS_URL)
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				if (!alive) return;
				const q = new Int16Array(buf);
				const n = q.length / 3;
				const pos = new Float32Array(q.length);
				const scatter = new Float32Array(q.length);
				const rand = new Float32Array(n);
				for (let i = 0; i < n; i += 1) {
					pos[i * 3] = q[i * 3] / 32767;
					pos[i * 3 + 1] = q[i * 3 + 1] / 32767;
					pos[i * 3 + 2] = q[i * 3 + 2] / 32767;
					// Start scattered on a wide shell; the scan pulls them into shape.
					const th = Math.random() * Math.PI * 2;
					const ph = Math.acos(2 * Math.random() - 1);
					const r = 2.2 + Math.random() * 2.5;
					scatter[i * 3] = r * Math.sin(ph) * Math.cos(th);
					scatter[i * 3 + 1] = r * Math.cos(ph);
					scatter[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
					rand[i] = Math.random();
				}
				const g = new THREE.BufferGeometry();
				g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
				g.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
				g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
				g.computeBoundingSphere();
				setGeometry(g);
			})
			.catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return geometry;
}

const CLOUD_VERT = /* glsl */ `
	uniform float uTime;
	uniform float uAssemble;
	uniform float uScan;
	uniform float uSize;
	uniform float uPixelRatio;
	uniform vec3 uPointer;
	uniform float uRepel;
	uniform float uBuild;
	uniform float uSpread;
	uniform float uSource;
	attribute vec3 aScatter;
	attribute float aRand;
	varying float vScan;
	varying float vAlpha;
	void main() {
		float t = clamp((uAssemble - aRand * 0.45) / 0.55, 0.0, 1.0);
		t = t * t * (3.0 - 2.0 * t);
		// Unassembled points wait in a cloud (uSpread scales it, uSource lowers it).
		vec3 p = mix(aScatter * uSpread + vec3(0.0, uSource, 0.0), position, t);
		p += 0.004 * vec3(sin(uTime * 2.0 + aRand * 40.0), cos(uTime * 1.7 + aRand * 30.0), 0.0);
		// Points part around the pointer like sand under a hand.
		vec3 away = p - uPointer;
		float near = exp(-dot(away, away) * 18.0) * uRepel;
		p += normalize(away + 1e-4) * near * 0.22;
		vScan = 1.0 - smoothstep(0.0, 0.03, abs(position.y - uScan));
		vAlpha = 0.35 + 0.65 * t;
		// Built up course by course from the ground (the cloud spans y -0.65..0.65);
		// the course just laid glows like fresh mortar.
		float course = floor((position.y + 0.65) * 23.0) / 23.0 - 0.65;
		float shown = step(course, uBuild);
		vScan = max(vScan, shown * (1.0 - smoothstep(0.0, 0.1, uBuild - course)));
		vAlpha *= shown;
		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		float depth = -mv.z;
		// Scattered points can drift right up to the camera: cap their size and
		// fade them out there, or a few huge additive sprites flood the screen.
		vAlpha *= smoothstep(0.8, 3.0, depth);
		gl_PointSize = shown * min(uSize * uPixelRatio * (1.0 + vScan * 0.7) / max(depth, 0.001), 10.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const CLOUD_FRAG = /* glsl */ `
	uniform vec3 uColor;
	uniform vec3 uScanColor;
	uniform float uOpacity;
	varying float vScan;
	varying float vAlpha;
	void main() {
		vec2 c = gl_PointCoord - 0.5;
		float d = length(c);
		if (d > 0.5) discard;
		float core = 1.0 - smoothstep(0.1, 0.5, d);
		vec3 col = mix(uColor, uScanColor * 1.1, vScan);
		gl_FragColor = vec4(col, core * uOpacity * vAlpha * (0.55 + 0.35 * vScan));
	}
`;

/**
 * Konark's Jagamohana as a live hologram: points assemble out of a scattered
 * shell (driven by `assemble`, 0–1) while an ochre scan line sweeps the height.
 * `build` (0–1, optional) raises it course by course from the ground.
 * `spread` and `source` shrink and lower the waiting cloud, e.g. so the points
 * stream up out of a phone screen.
 */
const rayCaster = new THREE.Raycaster();
const centre = new THREE.Vector3();
const hitPoint = new THREE.Vector3();

export function KonarkScan({ assemble, build, size = 26, spread = 1, source = 0, interactive = false, ...props }) {
	const t = usePalette();
	const geometry = usePointCloud();
	const mat = useRef(null);
	const group = useRef(null);
	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uAssemble: { value: 0 },
			uScan: { value: -1 },
			uSize: { value: size },
			uPixelRatio: { value: 1 },
			uColor: { value: new THREE.Color() },
			uScanColor: { value: new THREE.Color() },
			uOpacity: { value: 1 },
			uPointer: { value: new THREE.Vector3(99, 99, 99) },
			uRepel: { value: 0 },
			uBuild: { value: 1 },
			uSpread: { value: spread },
			uSource: { value: source },
		}),
		[size, spread, source]
	);

	useFrame((state, delta) => {
		const m = mat.current;
		if (!m) return;
		const u = m.uniforms;
		const time = state.clock.elapsedTime;
		u.uTime.value = time;
		u.uPixelRatio.value = state.gl.getPixelRatio();
		u.uAssemble.value = assemble?.get ? assemble.get() : 1;
		u.uBuild.value = -0.7 + 1.45 * (build?.get ? build.get() : 1);
		u.uScan.value = -0.7 + ((time * 0.28) % 1.6);
		u.uColor.value.set(t.points);
		u.uScanColor.value.set(t.accent);
		u.uOpacity.value = t.mode === "dark" ? 0.85 : 0.8;
		const g = group.current;
		if (!g) return;
		// Slow spin, steered a little by the pointer.
		g.rotation.y += delta * 0.1;
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, state.pointer.y * 0.15, 3, delta);
		// Pointer ray → the cloud's own space, for the repel.
		rayCaster.setFromCamera(state.pointer, state.camera);
		g.updateWorldMatrix(true, false);
		g.getWorldPosition(centre);
		const toCentre = rayCaster.ray.closestPointToPoint(centre, hitPoint);
		g.worldToLocal(toCentre);
		u.uPointer.value.lerp(toCentre, Math.min(1, delta * 8));
		u.uRepel.value = THREE.MathUtils.damp(u.uRepel.value, interactive ? 1 : 0, 4, delta);
	});

	return (
		<group {...props}>
			<group ref={group}>
				{geometry && (
					<points geometry={geometry} frustumCulled={false}>
						<shaderMaterial
							ref={mat}
							uniforms={uniforms}
							vertexShader={CLOUD_VERT}
							fragmentShader={CLOUD_FRAG}
							transparent
							depthWrite={false}
							blending={t.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
						/>
					</points>
				)}
			</group>
		</group>
	);
}
