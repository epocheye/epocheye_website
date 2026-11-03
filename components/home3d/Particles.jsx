"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import { ERAS, SHAPES, labelEls, ui } from "./scenes";
import { DESTINATIONS, VIDEO_SIZE } from "./shapes";

const SCAN_URL = "/preorder/konark-points.bin";
const GEO_URL = "/home/globe.bin";
const INDIA_URL = "/home/india.bin";
const LOGO_URL = "/logo-white.png";

/** The logo's ink pixels as (x, y, isLetter) in [-1, 1]: the ring in bone, the letters inside it in signal. */
function sampleLogo(img) {
	const size = 200;
	const c = document.createElement("canvas");
	c.width = c.height = size;
	const ctx = c.getContext("2d", { willReadFrequently: true });
	ctx.drawImage(img, 0, 0, size, size);
	const { data } = ctx.getImageData(0, 0, size, size);
	const px = [];
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			if (data[(y * size + x) * 4 + 3] < 128) continue;
			const u = (x / size) * 2 - 1;
			const v = 1 - (y / size) * 2;
			px.push(u, v, Math.hypot(u, v) < 0.82 ? 1 : 0);
		}
	}
	return { px: new Float32Array(px), step: 2 / size };
}
const D2R = Math.PI / 180;

const VERT = /* glsl */ `
	uniform float uT;
	uniform float uTime;
	uniform float uSize;
	uniform float uPixelRatio;
	uniform float uScan;
	uniform float uPinSel;
	uniform vec3 uPointer;
	uniform float uRepel;
	uniform sampler2D uVideo;
	uniform vec2 uVideoSize;
	attribute vec3 aFrom;
	attribute vec3 aTo;
	attribute vec4 aFromMeta;
	attribute vec4 aToMeta;
	attribute float aRand;
	varying vec3 vColor;
	varying float vAlpha;

	const vec3 BONE = vec3(0.949, 0.937, 0.902);
	const vec3 SIGNAL = vec3(0.80, 1.0, 0.0);

	void main() {
		// Each point leaves and lands at its own moment, so shapes dissolve and re-form like dust.
		float t = clamp((uT - aRand * 0.35) / 0.65, 0.0, 1.0);
		t = t * t * (3.0 - 2.0 * t);
		vec3 p = mix(aFrom, aTo, t);
		vec4 meta = mix(aFromMeta, aToMeta, t);
		float pin = t < 0.5 ? aFromMeta.z : aToMeta.z;

		// Mid-flight, points swirl through a slow current instead of travelling in straight lines.
		float flight = sin(t * 3.14159);
		p += flight * (0.6 + aRand) * vec3(
			sin(p.y * 1.3 + aRand * 6.0 + uTime * 0.6),
			sin(p.z * 1.1 + aRand * 5.0 + uTime * 0.5),
			cos(p.x * 1.2 + aRand * 7.0)
		);

		// The voice surface.
		p.y += meta.y * sin(uTime * 2.4 + p.x * 1.7 + p.z * 1.2) * 0.32 * (0.6 + 0.4 * sin(uTime * 0.9 + p.x * 0.5));

		// The footage: each point takes its pixel's colour and rises with its brightness.
		vec3 grid = aFromMeta.w > 0.5 ? aFrom : aTo;
		vec3 pixel = texture2D(uVideo, grid.xy / uVideoSize + 0.5).rgb;
		float lum = dot(pixel, vec3(0.299, 0.587, 0.114));
		p.z += meta.w * lum * 0.9;

		// Points part around the pointer, like sand under a hand.
		vec3 away = p - uPointer;
		float near = exp(-dot(away.xy, away.xy) * 2.2) * uRepel;
		p += normalize(away + 1e-4) * near * 0.5;

		// A slow breath, so nothing ever sits perfectly still.
		p += 0.01 * vec3(sin(uTime * 1.3 + aRand * 40.0), cos(uTime * 1.1 + aRand * 30.0), sin(uTime * 0.9 + aRand * 20.0));

		vec4 mv = modelViewMatrix * vec4(p, 1.0);
		float depth = -mv.z;

		float sel = (pin >= 0.0 && abs(pin - uPinSel) < 0.5) ? 1.0 : 0.0;
		float scan = (1.0 - smoothstep(0.0, 0.06, abs(p.y - uScan))) * (1.0 - meta.w);
		vColor = mix(BONE, SIGNAL, clamp(meta.x + sel, 0.0, 1.0));
		vColor = mix(vColor, pixel * 1.25 + 0.04, meta.w);
		vColor += SIGNAL * scan * 0.45;

		float size = uSize * (0.65 + aRand * 0.7) * (1.0 + meta.x * 0.35 + sel * 0.9 + scan * 0.4 + meta.w * 0.25);
		gl_PointSize = min(size * uPixelRatio / max(depth, 0.001), 9.0 * uPixelRatio);
		vAlpha = (0.42 + 0.3 * meta.x + 0.4 * sel + 0.25 * meta.w) * smoothstep(3.0, 7.0, depth) * (1.0 - 0.35 * flight);
		gl_Position = projectionMatrix * mv;
	}
`;

const FRAG = /* glsl */ `
	varying vec3 vColor;
	varying float vAlpha;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		if (d > 0.5) discard;
		float core = 1.0 - smoothstep(0.05, 0.5, d);
		gl_FragColor = vec4(vColor, core * vAlpha);
	}
`;

// The room behind the cloud: a charcoal ground that is never flat black, a
// slow drifting haze, and a pool of light behind the shape tinted to suit it
// (sandstone for the monuments, sea-blue for the globe, and so on).
const BACK_VERT = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.9999, 1.0);
	}
`;
const BACK_FRAG = /* glsl */ `
	uniform float uTime;
	uniform float uAspect;
	uniform vec2 uGlow;
	uniform vec3 uTint;
	varying vec2 vUv;
	float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
	float noise(vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
	}
	float fbm(vec2 p) {
		float v = 0.0;
		float a = 0.5;
		for (int i = 0; i < 5; i++) {
			v += a * noise(p);
			p *= 2.03;
			a *= 0.5;
		}
		return v;
	}
	void main() {
		vec2 p = vUv * 2.0 - 1.0;
		p.x *= uAspect;
		vec2 g = uGlow;
		g.x *= uAspect;
		// Linear light: these small numbers come out as deep charcoal on screen.
		// Charcoal, lifting toward the top like a lit room.
		vec3 col = mix(vec3(0.0032, 0.0034, 0.0036), vec3(0.0075, 0.0078, 0.008), smoothstep(-0.2, 1.2, vUv.y));
		float d = length(p - g);
		float pool = exp(-d * d * 0.6);
		float haze = fbm(p * 1.3 + vec2(uTime * 0.025, -uTime * 0.018));
		float wisps = fbm(p * 3.2 - vec2(uTime * 0.04, uTime * 0.01));
		col += uTint * (pool * 0.55 + haze * 0.18);
		col += vec3(0.0035) * wisps * haze;
		// A faint horizon band low on the screen, so the space has a floor.
		col += uTint * 0.12 * exp(-pow((vUv.y - 0.18) * 7.0, 2.0));
		gl_FragColor = vec4(col, 1.0);
	}
`;

const smooth = (a, b, x) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
/** Shortest signed angle from a to b. */
const turn = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

const rayCaster = new THREE.Raycaster();
const centre = new THREE.Vector3();
const hit = new THREE.Vector3();
const v3 = new THREE.Vector3();
const c1 = new THREE.Color();
const c2 = new THREE.Color();

/**
 * The cloud. `track.f` is the scroll position in steps (−1 = scattered dust
 * before the first step, 0 = first step, 0.5 = halfway to the second …) and
 * `track.steps` lists each step's shape and which side its text sits on.
 */
function Cloud({ count, track }) {
	const points = useRef(null);
	const group = useRef(null);
	const data = useRef({}); // scan, geo, mark: what some shapes wait on
	const cache = useRef(new Map());
	const shown = useRef({ a: null, b: null });
	const backdrop = useRef(null);
	const tint = useRef(new THREE.Color("#1a1a1a"));
	const motion = useRef({ spin: 0, globeX: 0, globeY: 0, x: 0, y: 0, s: 1, rx: 0, ry: 0 });

	const { geometry, video } = useMemo(() => {
		const g = new THREE.BufferGeometry();
		const rand = new Float32Array(count);
		for (let i = 0; i < count; i += 1) {
			const x = Math.sin((i + 1) * 12.9898) * 43758.5453;
			rand[i] = x - Math.floor(x);
		}
		g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		g.setAttribute("aFrom", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		g.setAttribute("aTo", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
		g.setAttribute("aFromMeta", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
		g.setAttribute("aToMeta", new THREE.BufferAttribute(new Float32Array(count * 4), 4));
		g.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
		const el = document.createElement("video");
		el.src = "/shot2.mp4";
		el.muted = true;
		el.loop = true;
		el.playsInline = true;
		el.preload = "none";
		const texture = new THREE.VideoTexture(el);
		texture.colorSpace = THREE.SRGBColorSpace;
		return { geometry: g, video: texture };
	}, [count]);

	const uniforms = useMemo(
		() => ({
			uT: { value: 0 },
			uTime: { value: 0 },
			uSize: { value: 30 },
			uPixelRatio: { value: 1 },
			uScan: { value: 0 },
			uPinSel: { value: -9 },
			uPointer: { value: new THREE.Vector3(99, 99, 99) },
			uRepel: { value: 0 },
			uVideo: { value: video },
			uVideoSize: { value: new THREE.Vector2(...VIDEO_SIZE) },
		}),
		[video]
	);

	const ready = (key) => (SHAPES[key].needs ?? []).every((n) => data.current[n]);

	const backUniforms = useMemo(
		() => ({ uTime: { value: 0 }, uAspect: { value: 1 }, uGlow: { value: new THREE.Vector2() }, uTint: { value: new THREE.Color("#1a1a1a") } }),
		[]
	);

	// The temple scan, the two maps and the logo arrive over the network; until each
	// does, the shapes that need it stand in as dust.
	useEffect(() => {
		let alive = true;
		const arrive = (name, value) => {
			if (!alive) return;
			data.current[name] = value;
			for (const [key, s] of Object.entries(SHAPES)) if (s.needs?.includes(name)) cache.current.delete(key);
			shown.current = { a: null, b: null };
		};
		fetch(SCAN_URL)
			.then((r) => r.arrayBuffer())
			.then((buf) => arrive("scan", new Int16Array(buf)))
			.catch(() => {});
		fetch(GEO_URL)
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				const borders = new DataView(buf).getUint32(0, true);
				const maskBytes = (720 * 360) / 8;
				arrive("geo", { mask: new Uint8Array(buf, 4, maskBytes), borders: new Int16Array(buf.slice(4 + maskBytes, 4 + maskBytes + borders * 4)) });
			})
			.catch(() => {});
		fetch(INDIA_URL)
			.then((r) => r.arrayBuffer())
			.then((buf) => {
				const head = new DataView(buf);
				const [latMin, latMax, lonMin, lonMax] = [0, 4, 8, 12].map((o) => head.getFloat32(o, true));
				const [cols, rows, borders] = [16, 20, 24].map((o) => head.getUint32(o, true));
				const maskBytes = Math.ceil((cols * rows) / 8);
				arrive("india", {
					latMin,
					latMax,
					lonMin,
					lonMax,
					cols,
					rows,
					mask: new Uint8Array(buf, 28, maskBytes),
					borders: new Int16Array(buf.slice(28 + maskBytes, 28 + maskBytes + borders * 4)),
				});
			})
			.catch(() => {});
		const img = new Image();
		img.onload = () => arrive("mark", sampleLogo(img));
		img.src = LOGO_URL;
		return () => {
			alive = false;
		};
	}, []);

	// Build every shape ahead of time, a few per idle moment, so scrolling never waits on one.
	useEffect(() => {
		const keys = Object.keys(SHAPES);
		let cancelled = false;
		let handle = 0;
		const idle = window.requestIdleCallback ?? ((fn) => setTimeout(() => fn({ timeRemaining: () => 8 }), 60));
		const cancel = window.cancelIdleCallback ?? clearTimeout;
		const step = (deadline) => {
			while (!cancelled && keys.length && deadline.timeRemaining() > 4) {
				const key = keys.shift();
				if (!ready(key)) keys.push(key);
				else if (!cache.current.has(key)) cache.current.set(key, SHAPES[key].make(count, data.current));
				if (keys.every((k) => !ready(k))) break;
			}
			if (!cancelled && keys.length) handle = idle(step);
		};
		handle = idle(step);
		return () => {
			cancelled = true;
			cancel(handle);
			video.image.pause?.();
		};
	}, [count, video]);

	const shape = (key) => {
		const def = SHAPES[key];
		if (!ready(key)) return shape("dust");
		let s = cache.current.get(key);
		if (!s) {
			s = def.make(count, data.current);
			cache.current.set(key, s);
		}
		return s;
	};

	useFrame((state, delta) => {
		const pts = points.current;
		const g = group.current;
		if (!pts || !g) return;
		const u = pts.material.uniforms;
		const m = motion.current;
		const { steps } = track;
		const n = steps.length;
		const keyOf = (i) => {
			if (i < 0) return "dust";
			const st = steps[Math.min(i, n - 1)];
			return st.shape === "eras" ? ERAS[Math.round(ui.era)].shape : st.shape;
		};

		// Which two shapes are we between, and how far?
		const f = Math.max(-1, Math.min(n - 1, track.f));
		const i = Math.min(n - 2, Math.floor(f));
		let a = keyOf(i);
		let b = keyOf(i + 1);
		let t = smooth(0.18, 0.82, f - i);
		let sideA = steps[Math.max(0, i)]?.side;
		let sideB = steps[i + 1]?.side;
		if (f >= n - 1) {
			a = b = keyOf(n - 1);
			t = 0;
			sideA = sideB = steps[n - 1].side;
		}
		// Resting on the timeline step: the timeline drives the morph instead.
		const erasAt = steps.findIndex((s) => s.shape === "eras");
		if (erasAt >= 0 && Math.abs(f - erasAt) < 0.18) {
			const e = ui.era;
			a = ERAS[Math.floor(e)].shape;
			b = ERAS[Math.min(ERAS.length - 1, Math.ceil(e))].shape;
			t = smooth(0, 1, e - Math.floor(e));
			sideA = sideB = steps[erasAt].side;
		}

		// Upload a new pair of shapes when it changes.
		if (shown.current.a !== a || shown.current.b !== b) {
			const A = shape(a);
			const B = shape(b);
			const attr = pts.geometry.attributes;
			attr.aFrom.array.set(A.pos);
			attr.aTo.array.set(B.pos);
			attr.aFromMeta.array.set(A.meta);
			attr.aToMeta.array.set(B.meta);
			attr.aFrom.needsUpdate = attr.aTo.needsUpdate = attr.aFromMeta.needsUpdate = attr.aToMeta.needsUpdate = true;
			shown.current = { a, b };
		}

		// Footage plays only while it is on screen.
		const vid = video.image;
		const showingVideo = a === "video" || b === "video";
		if (showingVideo && vid.paused) vid.play?.().catch(() => {});
		else if (!showingVideo && !vid.paused) vid.pause();

		// Globe: turn the picked destination to face us.
		const dest = DESTINATIONS[ui.destination];
		m.globeY += turn(m.globeY, -dest.lon * D2R) * Math.min(1, delta * 2.5);
		m.globeX = THREE.MathUtils.damp(m.globeX, dest.lat * D2R * 0.8, 2.5, delta);

		// Pose and placement, blended between the two shapes.
		const { width: W, height: H } = state.viewport.getCurrentViewport(state.camera, [0, 0, 0]);
		const portrait = W / H < 0.9;
		const place = (key, side) => {
			const p = SHAPES[key].pose;
			if (p.fixed) return { x: 0, y: 0, s: 1, rx: 0, ry: 0, spin: 0 };
			// "full": the shape spreads behind the whole page, so the glass cards over it have something to frost.
			const full = side === "full" && !portrait;
			const availW = portrait ? W * 0.94 : full ? W * 0.98 : W * 0.46;
			const availH = portrait ? H * 0.42 : full ? H * 0.9 : H * 0.74;
			return {
				x: portrait || full ? 0 : (side === "right" ? -1 : 1) * W * 0.235,
				y: portrait ? H * 0.22 : -H * 0.02,
				s: Math.min(availW / p.w, availH / p.h),
				rx: p.globe ? m.globeX : p.rx,
				ry: (p.globe ? m.globeY : p.ry) + Math.sin(state.clock.elapsedTime * 0.5) * (p.sway ?? 0),
				spin: p.spin ?? 0,
			};
		};
		const PA = place(a, sideA);
		const PB = place(b, sideB);
		const k = 1 - Math.exp(-6 * delta);
		m.x += (lerp(PA.x, PB.x, t) - m.x) * k;
		m.y += (lerp(PA.y, PB.y, t) - m.y) * k;
		m.s += (lerp(PA.s, PB.s, t) - m.s) * k;
		m.rx += (lerp(PA.rx, PB.rx, t) - m.rx) * k;
		m.ry += turn(m.ry, PA.ry + turn(PA.ry, PB.ry) * t) * k;
		// Slow turntable for the monuments; settles square for flat things like the phone.
		const spin = lerp(PA.spin, PB.spin, t);
		if (spin > 0.005) m.spin += delta * spin;
		else m.spin += turn(m.spin, 0) * Math.min(1, delta * 2);

		g.position.set(m.x, m.y, 0);
		g.scale.setScalar(m.s);
		g.rotation.set(m.rx - state.pointer.y * 0.12, m.ry + m.spin + state.pointer.x * 0.3, 0);

		// The backdrop: its light pools behind the shape and takes the shape's tint.
		const bu = backdrop.current?.material.uniforms;
		if (bu) {
			v3.set(m.x, m.y, 0).project(state.camera);
			bu.uGlow.value.set(v3.x, v3.y);
			bu.uAspect.value = state.size.width / state.size.height;
			bu.uTime.value = state.clock.elapsedTime;
			const ta = SHAPES[a].tint ?? "#1a1a1a";
			const tb = SHAPES[b].tint ?? "#1a1a1a";
			tint.current.lerp(c1.set(ta).lerp(c2.set(tb), t), Math.min(1, delta * 3));
			bu.uTint.value.copy(tint.current);
		}

		const time = state.clock.elapsedTime;
		u.uT.value = t;
		u.uTime.value = time;
		u.uPixelRatio.value = state.gl.getPixelRatio();
		u.uSize.value = (portrait ? 24 : 30) * Math.sqrt(m.s);
		u.uScan.value = -2.6 + ((time * 0.5) % 5.2);
		u.uPinSel.value = a === "globe" || b === "globe" ? ui.destination : ui.city >= 0 ? 100 + ui.city : -9;

		// The pointer, carried into the cloud's own space.
		rayCaster.setFromCamera(state.pointer, state.camera);
		g.updateWorldMatrix(true, false);
		g.getWorldPosition(centre);
		rayCaster.ray.closestPointToPoint(centre, hit);
		g.worldToLocal(hit);
		u.uPointer.value.lerp(hit, Math.min(1, delta * 10));
		u.uRepel.value = THREE.MathUtils.damp(u.uRepel.value, track.pointerActive ? 1 : 0, 4, delta);

		// Pin labels to their anchors while a shape is at rest.
		for (const [key, weight] of [
			[a, a === b ? 1 : 1 - t],
			[b, a === b ? 0 : t],
		]) {
			const anchors = SHAPES[key].anchors;
			if (!anchors) continue;
			for (const anchor of anchors) {
				const el = labelEls[anchor.id];
				if (!el) continue;
				v3.set(...anchor.pos);
				g.localToWorld(v3);
				const front = key !== "globe" || v3.z - centre.z > 0.4;
				const picked = key !== "globe" || anchor.id === `dest-${ui.destination}`;
				const o = front && picked ? smooth(0.82, 1, weight) : 0;
				v3.project(state.camera);
				el.style.opacity = String(o);
				el.style.transform = `translate(${((v3.x + 1) / 2) * state.size.width}px, ${((1 - v3.y) / 2) * state.size.height}px)`;
			}
		}
		// Labels of shapes that are neither from nor to stay hidden.
		for (const [key, s] of Object.entries(SHAPES)) {
			if (key === a || key === b || !s.anchors) continue;
			for (const anchor of s.anchors) if (labelEls[anchor.id]) labelEls[anchor.id].style.opacity = "0";
		}
	});

	return (
		<>
			<mesh ref={backdrop} renderOrder={-1} frustumCulled={false}>
				<planeGeometry args={[2, 2]} />
				<shaderMaterial uniforms={backUniforms} vertexShader={BACK_VERT} fragmentShader={BACK_FRAG} depthTest={false} depthWrite={false} />
			</mesh>
			<group ref={group}>
				<points ref={points} geometry={geometry} frustumCulled={false}>
					<shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
				</points>
			</group>
		</>
	);
}

export default function Particles({ track, active, eventSource, count }) {
	return (
		<Canvas
			dpr={[1, 1.75]}
			frameloop={active ? "always" : "never"}
			camera={{ position: [0, 0, 13], fov: 35, near: 0.1, far: 80 }}
			gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
			eventSource={eventSource}
			eventPrefix="client"
			style={{ pointerEvents: "none" }}>
			<color attach="background" args={["#0A0A0B"]} />
			<Cloud count={count} track={track} />
			<EffectComposer multisampling={0}>
				<Bloom intensity={0.55} luminanceThreshold={0.55} luminanceSmoothing={0.35} mipmapBlur />
				<Vignette eskil={false} offset={0.3} darkness={0.45} />
			</EffectComposer>
		</Canvas>
	);
}
