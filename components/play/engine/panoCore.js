// Panorama engine for Epocheye Play. Plain three.js, no React, no site-specific code.
// Loaded on the client only (dynamic import from PanoViewer.jsx).
//
// A viewpoint is six square pictures. Each was rendered by a 90 degree camera whose forward and up
// vectors, in the site's Z-up axes, are site.face_axes[face].f and .u. The cube is built from six
// planes using exactly those vectors, so no cube-map convention is assumed.
//
// Colour = mix(NOW, THEN, k), k = clamp(max_i(mask_i * reveal_i) + all, 0, 1).
// Pixels pass straight through: no colour conversion, no tone mapping.

import * as THREE from "three";

export const FOV_MIN = 45;
export const FOV_MAX = 95;
const DEG = Math.PI / 180;
const PITCH_MAX = 85 * DEG;
const MAX_MASKS = 4;
const REVEAL_MS = 2500;
const QUICK_MS = 350;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tNow;
uniform sampler2D tThen;
uniform sampler2D tMask0;
uniform sampler2D tMask1;
uniform sampler2D tMask2;
uniform sampler2D tMask3;
uniform sampler2D tTier;
uniform vec4 uReveal;
uniform float uHasThen;
uniform float uHasTier;
uniform float uAll;
uniform float uProof;
uniform float uFace;
uniform float uFaces;
uniform float uHalf;
uniform float uFade;
varying vec2 vUv;
void main() {
	vec3 now = texture2D(tNow, vUv).rgb;
	vec3 then = texture2D(tThen, vUv).rgb;
	// Masks are one strip of faces side by side. Stay half a texel inside this face.
	vec2 m = vec2((uFace + clamp(vUv.x, uHalf, 1.0 - uHalf)) / uFaces, vUv.y);
	float k = max(
		max(texture2D(tMask0, m).r * uReveal.x, texture2D(tMask1, m).r * uReveal.y),
		max(texture2D(tMask2, m).r * uReveal.z, texture2D(tMask3, m).r * uReveal.w));
	k = clamp(k + uAll, 0.0, 1.0) * uHasThen;
	// Proof: where THEN is our reconstruction, fade it to a plain neutral.
	float p = texture2D(tTier, m).r * uHasTier * uProof;
	float l = dot(then, vec3(0.299, 0.587, 0.114));
	then = mix(then, vec3(mix(l, 0.6, 0.3)), p);
	gl_FragColor = vec4(mix(now, then, k) * uFade, 1.0);
}`;

export function siteToThree(v, out = new THREE.Vector3()) {
	return out.set(v[0], v[2], -v[1]);
}

function loadImage(url) {
	const img = new Image();
	img.decoding = "async";
	img.src = url;
	return img.decode().then(() => img);
}

function faceTexture(img, mip) {
	const t = new THREE.Texture(img);
	t.colorSpace = THREE.NoColorSpace;
	t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
	t.generateMipmaps = mip;
	t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
	t.magFilter = THREE.LinearFilter;
	t.anisotropy = mip ? 4 : 1;
	t.needsUpdate = true;
	return t;
}

function maskTexture(img) {
	const t = new THREE.Texture(img);
	t.colorSpace = THREE.NoColorSpace;
	t.format = THREE.RedFormat;
	t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
	t.generateMipmaps = false;
	t.minFilter = t.magFilter = THREE.LinearFilter;
	t.needsUpdate = true;
	return t;
}

function pixelTexture(value) {
	const t = new THREE.DataTexture(new Uint8Array([value, value, value, 255]), 1, 1, THREE.RGBAFormat);
	t.colorSpace = THREE.NoColorSpace;
	t.needsUpdate = true;
	return t;
}

const ease = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

export class PanoCore {
	constructor(container, { site, urls, reducedMotion = false, onFrame, onStatus }) {
		this.container = container;
		this.site = site;
		this.urls = urls;
		this.reduced = reducedMotion;
		this.onFrame = onFrame || (() => {});
		this.onStatus = onStatus || (() => {});
		this.sizes = [...(site.sizes || [512])].sort((a, b) => a - b);
		this.disposed = false;

		const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: "high-performance" });
		renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.setClearColor(0x080808, 1);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer = renderer;
		this.canvas = renderer.domElement;
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;";
		container.appendChild(this.canvas);

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 10);
		this.black = pixelTexture(0);
		this.shared = {
			tMask0: { value: this.black }, tMask1: { value: this.black }, tMask2: { value: this.black }, tMask3: { value: this.black },
			tTier: { value: this.black },
			uReveal: { value: new THREE.Vector4(0, 0, 0, 0) },
			uHasThen: { value: 0 }, uHasTier: { value: 0 }, uAll: { value: 0 }, uProof: { value: 0 },
			uFaces: { value: site.faces.length }, uHalf: { value: 0.5 / 1024 }, uFade: { value: 1 },
		};
		this.meshes = site.faces.map((name, i) => {
			const ax = site.face_axes[name];
			const f = siteToThree(ax.f);
			const u = siteToThree(ax.u);
			const r = new THREE.Vector3().crossVectors(f, u); // image right
			const corner = (sr, su) => f.clone().addScaledVector(r, sr).addScaledVector(u, su);
			const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
			const geo = new THREE.BufferGeometry();
			geo.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap((p) => [p.x, p.y, p.z]), 3));
			geo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
			geo.setIndex([0, 1, 2, 0, 2, 3]);
			geo.computeBoundingSphere();
			const mat = new THREE.ShaderMaterial({
				uniforms: { ...this.shared, tNow: { value: this.black }, tThen: { value: this.black }, uFace: { value: i } },
				vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
			});
			const mesh = new THREE.Mesh(geo, mat);
			this.scene.add(mesh);
			return mesh;
		});

		// View
		this.yaw = 0;
		this.pitch = 0;
		this.fov = 75;
		this.vel = { yaw: 0, pitch: 0 };
		this.tween = null;
		this.gyro = null;
		this.width = 1;
		this.height = 1;

		// Node and textures
		this.gen = 0;
		this.node = null;
		this.primary = null;
		this.secondary = null;
		this.maskSlots = [];
		this.tex = { primary: { size: 0, faces: [] }, then: { size: 0, faces: [] }, masks: new Map(), tier: null };
		this.failed = new Set();
		this.refining = false;
		this.refineAgain = false;
		this.preloadThen = false;
		this.shownOnce = false;

		// Blend state
		this.reveal = new Map(); // restoration id -> { value, from, to, t0, dur, waiting, resolve }
		this.all = { value: 0, from: 0, to: 0, t0: 0, dur: 0 };
		this.proof = { value: 0, from: 0, to: 0, t0: 0, dur: 0 };
		this.fade = { value: 1, t0: 0, dur: 0 };

		this.raf = 0;
		this.frame = this.frame.bind(this);
		this.bind();
		this.resize();
	}

	// ---------------------------------------------------------------- events

	bind() {
		const el = this.canvas;
		this.pointers = new Map();
		this.pinch = null;
		this.onDown = (e) => {
			if (e.pointerType === "mouse" && e.button !== 0) return;
			el.setPointerCapture?.(e.pointerId);
			this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
			this.tween = null;
			this.vel.yaw = this.vel.pitch = 0;
			if (this.pointers.size === 2) {
				const [a, b] = [...this.pointers.values()];
				this.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, fov: this.fov };
			}
		};
		this.onMove = (e) => {
			const p = this.pointers.get(e.pointerId);
			if (!p) return;
			const now = performance.now();
			const dx = e.clientX - p.x;
			const dy = e.clientY - p.y;
			const dt = Math.max(1, now - p.t);
			p.x = e.clientX;
			p.y = e.clientY;
			p.t = now;
			if (this.pointers.size >= 2 && this.pinch) {
				const [a, b] = [...this.pointers.values()];
				const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
				this.setFov(this.pinch.fov * (this.pinch.dist / dist));
				return;
			}
			const k = (this.fov * DEG) / this.height;
			this.turn(-dx * k, dy * k);
			this.vel.yaw = (-dx * k) / dt;
			this.vel.pitch = (dy * k) / dt;
		};
		this.onUp = (e) => {
			const p = this.pointers.get(e.pointerId);
			this.pointers.delete(e.pointerId);
			if (this.pointers.size < 2) this.pinch = null;
			if (this.pointers.size === 0) {
				const stale = !p || performance.now() - p.t > 80;
				if (this.reduced || stale || this.gyro) this.vel.yaw = this.vel.pitch = 0;
				this.invalidate();
				this.kick();
			}
		};
		this.onWheel = (e) => {
			e.preventDefault();
			this.setFov(this.fov + clamp(e.deltaY, -120, 120) * 0.05);
			clearTimeout(this.wheelTimer);
			this.wheelTimer = setTimeout(() => this.kick(), 250);
		};
		this.onLost = (e) => e.preventDefault();
		this.onRestored = () => this.invalidate();
		el.addEventListener("pointerdown", this.onDown);
		el.addEventListener("pointermove", this.onMove);
		el.addEventListener("pointerup", this.onUp);
		el.addEventListener("pointercancel", this.onUp);
		el.addEventListener("wheel", this.onWheel, { passive: false });
		el.addEventListener("webglcontextlost", this.onLost);
		el.addEventListener("webglcontextrestored", this.onRestored);
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(this.container);
	}

	resize() {
		if (this.disposed) return;
		const w = Math.max(1, this.container.clientWidth);
		const h = Math.max(1, this.container.clientHeight);
		this.width = w;
		this.height = h;
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.invalidate();
		this.kick();
	}

	// ---------------------------------------------------------------- view

	defaultFov() {
		return this.width < this.height ? 90 : 72;
	}

	setFov(fov) {
		this.fov = clamp(fov, FOV_MIN, FOV_MAX);
		this.invalidate();
	}

	zoomBy(delta) {
		this.setFov(this.fov + delta);
		this.kick();
	}

	turn(dyaw, dpitch) {
		if (this.gyro?.on) this.gyro.offset += dyaw;
		else {
			this.yaw += dyaw;
			this.pitch = clamp(this.pitch + dpitch, -PITCH_MAX, PITCH_MAX);
		}
		this.invalidate();
	}

	// Step the view (keys and on-screen buttons). Degrees.
	nudge(dyawDeg, dpitchDeg) {
		const toYaw = (this.tween ? this.tween.toYaw : this.yaw) + dyawDeg * DEG;
		const toPitch = clamp((this.tween ? this.tween.toPitch : this.pitch) + dpitchDeg * DEG, -PITCH_MAX, PITCH_MAX);
		this.moveTo(toYaw, toPitch, 220);
	}

	// Point the camera along a direction given in site axes.
	lookAlong(dir, { animate = true } = {}) {
		if (!dir) return;
		const d = siteToThree(dir).normalize();
		let toYaw = Math.atan2(d.x, -d.z);
		const toPitch = clamp(Math.asin(clamp(d.y, -1, 1)), -PITCH_MAX, PITCH_MAX);
		// shortest way round
		const turns = Math.round((this.yaw - toYaw) / (2 * Math.PI));
		toYaw += turns * 2 * Math.PI;
		this.moveTo(toYaw, toPitch, animate ? 650 : 0);
	}

	moveTo(toYaw, toPitch, ms) {
		this.vel.yaw = this.vel.pitch = 0;
		if (this.gyro?.on) {
			this.gyro.offset += toYaw - this.yaw;
			this.invalidate();
			return;
		}
		if (this.reduced || !(ms > 0)) {
			this.tween = null;
			this.yaw = toYaw;
			this.pitch = toPitch;
		} else {
			this.tween = { fromYaw: this.yaw, fromPitch: this.pitch, toYaw, toPitch, t0: performance.now(), dur: ms };
		}
		this.invalidate();
	}

	applyCamera() {
		const cam = this.camera;
		if (this.gyro?.on && this.gyro.q) {
			this._qy = this._qy || new THREE.Quaternion();
			this._up = this._up || new THREE.Vector3(0, 1, 0);
			cam.quaternion.copy(this._qy.setFromAxisAngle(this._up, -this.gyro.offset)).multiply(this.gyro.q);
			const f = (this._f = this._f || new THREE.Vector3()).set(0, 0, -1).applyQuaternion(cam.quaternion);
			this.yaw = Math.atan2(f.x, -f.z);
			this.pitch = Math.asin(clamp(f.y, -1, 1));
		} else {
			const cp = Math.cos(this.pitch);
			cam.up.set(0, 1, 0);
			cam.lookAt(Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
		}
		if (cam.fov !== this.fov) {
			cam.fov = this.fov;
		}
		cam.updateProjectionMatrix();
		cam.updateMatrixWorld();
	}

	// Screen position of a direction given in site axes. Null when it is behind the camera.
	project(dir) {
		const v = (this._p = this._p || new THREE.Vector3());
		const q = (this._qi = this._qi || new THREE.Quaternion());
		siteToThree(dir, v).normalize().applyQuaternion(q.copy(this.camera.quaternion).invert());
		if (v.z > -0.05) return null;
		const t = Math.tan((this.fov * DEG) / 2);
		const nx = v.x / -v.z / (t * this.camera.aspect);
		const ny = v.y / -v.z / t;
		return { x: (nx * 0.5 + 0.5) * this.width, y: (-ny * 0.5 + 0.5) * this.height, inView: Math.abs(nx) <= 1 && Math.abs(ny) <= 1 };
	}

	view() {
		return { yaw: this.yaw / DEG, pitch: this.pitch / DEG, fov: this.fov, size: this.tex.primary.size, thenSize: this.tex.then.size };
	}

	// ---------------------------------------------------------------- gyroscope

	async enableGyro() {
		const DOE = typeof window !== "undefined" ? window.DeviceOrientationEvent : null;
		if (!DOE) return "unsupported";
		if (typeof DOE.requestPermission === "function") {
			try {
				if ((await DOE.requestPermission()) !== "granted") return "denied";
			} catch {
				return "denied";
			}
		}
		if (this.disposed) return "unsupported";
		const zee = new THREE.Vector3(0, 0, 1);
		const euler = new THREE.Euler();
		const q0 = new THREE.Quaternion();
		const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
		const fwd = new THREE.Vector3();
		const state = { on: false, q: null, offset: 0, handler: null };
		const startYaw = this.yaw;
		state.handler = (e) => {
			if (e.alpha == null || e.beta == null || e.gamma == null) return;
			const orient = ((screen.orientation?.angle ?? window.orientation ?? 0) || 0) * DEG;
			const q = state.q || new THREE.Quaternion();
			euler.set(e.beta * DEG, e.alpha * DEG, -e.gamma * DEG, "YXZ");
			q.setFromEuler(euler).multiply(q1).multiply(q0.setFromAxisAngle(zee, -orient));
			if (!state.q) {
				// keep looking where the player was looking when they turned motion on
				fwd.set(0, 0, -1).applyQuaternion(q);
				state.offset = startYaw - Math.atan2(fwd.x, -fwd.z);
				state.q = q;
				state.on = true;
				this.tween = null;
			}
			this.invalidate();
		};
		window.addEventListener("deviceorientation", state.handler);
		this.gyro = state;
		// No sensor (most desktops): no event ever arrives.
		await new Promise((r) => setTimeout(r, 1200));
		if (!state.on) {
			this.disableGyro();
			return "unsupported";
		}
		return "on";
	}

	disableGyro() {
		if (!this.gyro) return;
		window.removeEventListener("deviceorientation", this.gyro.handler);
		this.gyro = null;
		this.invalidate();
	}

	// ---------------------------------------------------------------- node loading

	async loadFaces(nodeId, state, size) {
		const imgs = await Promise.all(this.site.faces.map((f) => loadImage(this.urls.face(nodeId, state, size, f))));
		return imgs.map((img) => faceTexture(img, size <= 1024));
	}

	async setNode(node, { state = "now", look = null, keepView = false } = {}) {
		const my = ++this.gen;
		const states = node.states?.length ? node.states : ["now"];
		const primary = states.includes(state) ? state : states[0];
		this.onStatus({ loading: true, node: node.id });
		const secondary = primary === "now" && states.includes("then") ? "then" : null;
		const slots = (node.masks || []).slice(0, MAX_MASKS);
		// If a restoration already shows here, bring THEN and its masks in with the first picture,
		// so the view does not arrive as NOW and then change.
		const shows = secondary && (this.all.to > 0 || slots.some((id) => (this.reveal.get(id)?.to || 0) > 0));
		let faces;
		let thenFaces = null;
		let maskImgs = [];
		try {
			[faces, thenFaces, maskImgs] = await Promise.all([
				this.loadFaces(node.id, primary, this.sizes[0]),
				shows ? this.loadFaces(node.id, "then", this.sizes[0]).catch(() => null) : null,
				shows ? Promise.all(slots.map((id) => loadImage(this.urls.mask(node.id, id)).catch(() => null))) : [],
			]);
		} catch {
			if (my === this.gen && !this.disposed) this.onStatus({ loading: false, node: node.id, error: "load" });
			return false;
		}
		if (my !== this.gen || this.disposed) {
			faces.forEach((t) => t.dispose());
			thenFaces?.forEach((t) => t.dispose());
			return false;
		}
		this.disposeNodeTextures();
		this.node = node;
		this.primary = primary;
		this.secondary = secondary;
		this.maskSlots = slots;
		this.failed.clear();
		this.tex.primary = { size: this.sizes[0], faces };
		if (thenFaces) this.tex.then = { size: this.sizes[0], faces: thenFaces };
		maskImgs.forEach((img, i) => {
			if (img) this.tex.masks.set(slots[i], this.maskFrom(img));
		});
		this.applyTextures();
		if (!keepView) {
			const d = siteToThree(look || node.look || [0, 1, 0]).normalize();
			this.tween = null;
			this.vel.yaw = this.vel.pitch = 0;
			const yaw = Math.atan2(d.x, -d.z);
			if (this.gyro?.on) this.gyro.offset += yaw - this.yaw;
			this.yaw = yaw;
			this.pitch = clamp(Math.asin(clamp(d.y, -1, 1)), -PITCH_MAX, PITCH_MAX);
			if (!this.shownOnce) this.fov = this.defaultFov();
		}
		if (this.shownOnce && !this.reduced) this.fade = { value: 0.25, t0: performance.now(), dur: 320 };
		const first = !this.shownOnce;
		this.shownOnce = true;
		this.invalidate();
		this.onStatus({ loading: false, node: node.id, size: this.sizes[0], first });
		this.kick();
		return true;
	}

	maskFrom(img) {
		// half a texel of one face, in face units
		this.shared.uHalf.value = 0.5 / Math.max(1, img.naturalWidth / this.site.faces.length);
		return maskTexture(img);
	}

	applyTextures() {
		const { primary, then, masks, tier } = this.tex;
		const thenIsPrimary = this.primary === "then";
		const thenFaces = thenIsPrimary ? primary.faces : then.faces;
		this.meshes.forEach((mesh, i) => {
			const u = mesh.material.uniforms;
			u.tNow.value = primary.faces[i] || this.black;
			u.tThen.value = thenFaces[i] || this.black;
		});
		const s = this.shared;
		s.uHasThen.value = thenFaces.length ? 1 : 0;
		for (let i = 0; i < MAX_MASKS; i++) s[`tMask${i}`].value = masks.get(this.maskSlots[i]) || this.black;
		s.tTier.value = tier || this.black;
		s.uHasTier.value = tier ? 1 : 0;
		this.invalidate();
	}

	disposeNodeTextures() {
		const { primary, then, masks, tier } = this.tex;
		primary.faces.forEach((t) => t.dispose());
		then.faces.forEach((t) => t.dispose());
		masks.forEach((t) => t.dispose());
		tier?.dispose();
		this.tex = { primary: { size: 0, faces: [] }, then: { size: 0, faces: [] }, masks: new Map(), tier: null };
	}

	wantThen() {
		if (!this.secondary) return false;
		if (this.preloadThen || this.all.to > 0 || this.all.value > 0) return true;
		for (const id of this.maskSlots) {
			const r = this.reveal.get(id);
			if (r && (r.value > 0 || r.to > 0)) return true;
		}
		return false;
	}

	// The face size this canvas can actually show at the current zoom.
	targetSize() {
		const backing = this.height * this.renderer.getPixelRatio();
		const need = backing / Math.tan((this.fov * DEG) / 2);
		const lowMemory = typeof navigator !== "undefined" && navigator.deviceMemory && navigator.deviceMemory < 4;
		const maxTex = this.renderer.capabilities.maxTextureSize || 2048;
		let pick = this.sizes[0];
		for (const s of this.sizes) {
			if (s > maxTex || (s > 1024 && lowMemory)) break;
			pick = s;
			if (s * 1.25 >= need) break;
		}
		return pick;
	}

	nextJob() {
		const node = this.node;
		if (!node) return null;
		const my = this.gen;
		const stale = () => my !== this.gen || this.disposed;
		const { primary, then, masks } = this.tex;
		const guarded = (key, fn) => (this.failed.has(key) ? null : async () => {
			try {
				await fn();
			} catch {
				if (!stale()) this.failed.add(key);
			}
		});
		const facesJob = (state, slot, size) => guarded(`${state}:${size}`, async () => {
			const faces = await this.loadFaces(node.id, state, size);
			if (stale()) return faces.forEach((t) => t.dispose());
			if (size > this.sizes[0]) {
				// upload one face a frame so the swap does not stall the view
				for (const t of faces) {
					this.renderer.initTexture(t);
					await nextFrame();
					if (stale()) return faces.forEach((x) => x.dispose());
				}
			}
			const old = this.tex[slot].faces;
			this.tex[slot] = { size, faces };
			this.applyTextures();
			old.forEach((t) => t.dispose());
			this.onStatus({ loading: false, node: node.id, size: this.tex.primary.size });
		});
		const up = (cur) => this.sizes.find((s) => s > cur && s <= this.targetSize());

		if (this.wantThen()) {
			if (then.size === 0) {
				const job = facesJob("then", "then", this.sizes[0]);
				if (job) return job;
			}
			for (const id of this.maskSlots) {
				if (masks.has(id)) continue;
				const job = guarded(`mask:${id}`, async () => {
					const img = await loadImage(this.urls.mask(node.id, id));
					if (stale()) return;
					this.tex.masks.set(id, this.maskFrom(img));
					this.applyTextures();
				});
				if (job) return job;
			}
		}
		if ((this.proof.to > 0 || this.proof.value > 0) && node.tier && !this.tex.tier) {
			const job = guarded("tier", async () => {
				const img = await loadImage(this.urls.tier(node.id));
				if (stale()) return;
				this.tex.tier = this.maskFrom(img);
				this.applyTextures();
			});
			if (job) return job;
		}
		const p = up(primary.size);
		if (p) {
			const job = facesJob(this.primary, "primary", p);
			if (job) return job;
		}
		if (then.size > 0) {
			const t = up(then.size);
			if (t) {
				const job = facesJob("then", "then", t);
				if (job) return job;
			}
		}
		return null;
	}

	// Start (or re-check) background loading: THEN faces, masks, sharper sizes.
	kick() {
		if (this.disposed || !this.node) return;
		if (this.refining) {
			this.refineAgain = true;
			return;
		}
		this.refining = true;
		(async () => {
			try {
				for (;;) {
					if (this.disposed) break;
					this.refineAgain = false;
					const job = this.nextJob();
					if (job) {
						await job();
						this.startWaiting();
						continue;
					}
					this.startWaiting();
					if (!this.refineAgain) break;
				}
			} finally {
				this.refining = false;
			}
		})();
	}

	// ---------------------------------------------------------------- blend state

	setPreloadThen(on) {
		this.preloadThen = !!on;
		if (on) this.kick();
	}

	// Is everything a reveal of this restoration needs on screen (or known to be missing)?
	readyFor(id) {
		if (!this.node || !this.secondary || !this.maskSlots.includes(id)) return true;
		const thenOk = this.tex.then.size > 0 || this.failed.has(`then:${this.sizes[0]}`);
		const maskOk = this.tex.masks.has(id) || this.failed.has(`mask:${id}`);
		return thenOk && maskOk;
	}

	startWaiting() {
		const now = performance.now();
		let any = false;
		for (const [id, r] of this.reveal) {
			if (r.waiting && this.readyFor(id)) {
				r.waiting = false;
				r.t0 = now;
				any = true;
			}
		}
		if (any) this.invalidate();
	}

	// Set how much of a restoration shows (0 to 1). Resolves when the picture has settled.
	revealTo(id, to, { animate = false } = {}) {
		return new Promise((resolve) => {
			const prev = this.reveal.get(id);
			prev?.resolve?.();
			const from = prev ? prev.value : 0;
			if (!animate || from === to) {
				this.reveal.set(id, { value: to, from: to, to, t0: 0, dur: 0, waiting: false, resolve: null });
				this.invalidate();
				this.kick();
				resolve();
				return;
			}
			this.reveal.set(id, { value: from, from, to, t0: performance.now(), dur: this.reduced ? QUICK_MS : REVEAL_MS, waiting: true, resolve });
			this.kick();
			this.startWaiting();
			this.invalidate();
		});
	}

	dropReveal(id) {
		const r = this.reveal.get(id);
		r?.resolve?.();
		this.reveal.delete(id);
		this.invalidate();
	}

	setAll(on, { animate = true } = {}) {
		const to = on ? 1 : 0;
		const dur = !animate ? 0 : this.reduced ? QUICK_MS : 1800;
		this.all = { ...this.all, from: this.all.value, to, t0: performance.now(), dur };
		if (!dur) this.all.value = to;
		this.kick();
		this.invalidate();
	}

	setProof(on) {
		const to = on ? 1 : 0;
		this.proof = { ...this.proof, from: this.proof.value, to, t0: performance.now(), dur: this.reduced ? 0 : 600 };
		if (!this.proof.dur) this.proof.value = to;
		this.kick();
		this.invalidate();
	}

	// ---------------------------------------------------------------- frame

	invalidate() {
		if (this.raf || this.disposed) return;
		this.raf = requestAnimationFrame(this.frame);
	}

	frame(now) {
		this.raf = 0;
		if (this.disposed) return;
		let busy = false;
		const dt = Math.min(64, now - (this.last || now));
		this.last = now;

		if (this.tween) {
			const t = clamp((now - this.tween.t0) / this.tween.dur, 0, 1);
			const e = ease(t);
			this.yaw = this.tween.fromYaw + (this.tween.toYaw - this.tween.fromYaw) * e;
			this.pitch = this.tween.fromPitch + (this.tween.toPitch - this.tween.fromPitch) * e;
			if (t >= 1) this.tween = null;
			else busy = true;
		} else if (this.pointers.size === 0 && (Math.abs(this.vel.yaw) > 1e-5 || Math.abs(this.vel.pitch) > 1e-5)) {
			this.yaw += this.vel.yaw * dt;
			this.pitch = clamp(this.pitch + this.vel.pitch * dt, -PITCH_MAX, PITCH_MAX);
			const decay = Math.exp(-dt / 180);
			this.vel.yaw *= decay;
			this.vel.pitch *= decay;
			busy = true;
		}

		const step = (a) => {
			if (a.value === a.to) return;
			const t = a.dur > 0 ? clamp((now - a.t0) / a.dur, 0, 1) : 1;
			a.value = a.from + (a.to - a.from) * ease(t);
			if (t >= 1) a.value = a.to;
			else busy = true;
		};
		step(this.all);
		step(this.proof);
		for (const r of this.reveal.values()) {
			if (r.waiting) continue;
			if (r.value !== r.to) step(r);
			if (r.value === r.to && r.resolve) {
				const done = r.resolve;
				r.resolve = null;
				done();
			}
		}
		if (this.fade.dur) {
			const t = clamp((now - this.fade.t0) / this.fade.dur, 0, 1);
			this.shared.uFade.value = 0.25 + 0.75 * ease(t);
			if (t >= 1) this.fade.dur = 0;
			else busy = true;
		} else {
			this.shared.uFade.value = 1;
		}

		const rv = this.shared.uReveal.value;
		const slot = (i) => this.reveal.get(this.maskSlots[i])?.value || 0;
		rv.set(slot(0), slot(1), slot(2), slot(3));
		this.shared.uAll.value = this.primary === "then" ? 1 : this.all.value;
		this.shared.uProof.value = this.proof.value;

		this.applyCamera();
		this.renderer.render(this.scene, this.camera);
		this.onFrame(this);
		if (busy) this.invalidate();
		else this.last = 0;
	}

	// ---------------------------------------------------------------- teardown

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.gen++;
		cancelAnimationFrame(this.raf);
		clearTimeout(this.wheelTimer);
		this.disableGyro();
		this.ro.disconnect();
		const el = this.canvas;
		el.removeEventListener("pointerdown", this.onDown);
		el.removeEventListener("pointermove", this.onMove);
		el.removeEventListener("pointerup", this.onUp);
		el.removeEventListener("pointercancel", this.onUp);
		el.removeEventListener("wheel", this.onWheel);
		el.removeEventListener("webglcontextlost", this.onLost);
		el.removeEventListener("webglcontextrestored", this.onRestored);
		for (const r of this.reveal.values()) r.resolve?.();
		this.reveal.clear();
		this.disposeNodeTextures();
		this.black.dispose();
		for (const mesh of this.meshes) {
			mesh.geometry.dispose();
			mesh.material.dispose();
		}
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		el.remove();
	}
}
