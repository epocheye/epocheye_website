// The piece the player handles in the Restore step. Plain three.js, client only.
// One GLB from the pack, lit simply, turned about one axis until it is close to how it
// stands in the model. If the GLB is missing, a plain placeholder solid takes its place.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

function hash(str) {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
	return h >>> 0;
}

function placeholder() {
	const g = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.9, metalness: 0 });
	const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), mat);
	const foot = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), mat);
	foot.position.y = -0.84;
	const head = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.4, 4), mat);
	head.position.y = 0.95;
	head.rotation.y = Math.PI / 4;
	g.add(shaft, foot, head);
	return g;
}

function disposeTree(root) {
	root.traverse((o) => {
		o.geometry?.dispose();
		const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
		for (const m of mats) {
			for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
			m.dispose();
		}
	});
}

export class PieceCore {
	// turn: { axis?: [x,y,z] in site axes, start_deg?, step_deg?, snap_deg? }
	constructor(container, { url, id = "piece", turn = {}, reducedMotion = false, onState }) {
		this.container = container;
		this.reduced = reducedMotion;
		this.onState = onState || (() => {});
		this.disposed = false;
		this.step = turn.step_deg || 15;
		this.snapDeg = turn.snap_deg || 12;
		const a = turn.axis || [0, -1, 0]; // towards the viewer: the piece tips left and right on screen
		this.axis = new THREE.Vector3(a[0], a[2], -a[1]).normalize();
		const starts = [-135, -105, 105, 135];
		this.angle = wrap(turn.start_deg ?? starts[hash(id) % starts.length]);
		this.snapped = false;
		this.loaded = false;
		this.isPlaceholder = false;

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.toneMapping = THREE.NoToneMapping;
		this.renderer = renderer;
		this.canvas = renderer.domElement;
		this.canvas.setAttribute("aria-hidden", "true");
		this.canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab;";
		container.appendChild(this.canvas);

		this.scene = new THREE.Scene();
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4338, 1.4));
		const key = new THREE.DirectionalLight(0xffffff, 2.4);
		key.position.set(2, 3, 4);
		this.scene.add(key);
		this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
		this.camera.position.set(0.9, 0.7, 4.3);
		this.camera.lookAt(0, 0, 0);
		this.pivot = new THREE.Group();
		this.ghost = new THREE.Group();
		this.scene.add(this.pivot, this.ghost);
		this.ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.09, depthWrite: false });

		this.raf = 0;
		this.frame = this.frame.bind(this);
		this.bind();
		this.resize();
		this.load(url);
	}

	load(url) {
		const mount = (object, isPlaceholder) => {
			if (this.disposed) return disposeTree(object);
			const box = new THREE.Box3().setFromObject(object);
			const sphere = box.getBoundingSphere(new THREE.Sphere());
			const holder = new THREE.Group();
			object.position.sub(sphere.center);
			holder.add(object);
			holder.scale.setScalar(1 / Math.max(sphere.radius, 1e-4));
			this.pivot.add(holder);
			// A faint copy at the orientation to reach, so the fit can be seen.
			const copy = holder.clone(true);
			copy.traverse((o) => {
				if (o.isMesh) o.material = this.ghostMat;
			});
			this.ghost.add(copy);
			this.loaded = true;
			this.isPlaceholder = isPlaceholder;
			this.apply();
			this.emit();
		};
		if (!url) return mount(placeholder(), true);
		const loader = new GLTFLoader();
		loader.setMeshoptDecoder(MeshoptDecoder);
		const hasMesh = (root) => {
			let found = false;
			root?.traverse((o) => {
				if (o.isMesh) found = true;
			});
			return found;
		};
		loader.load(
			url,
			(gltf) => {
				// The default scene of an exported file can be empty. Take the first scene that has a mesh.
				const scenes = [gltf.scene, ...(gltf.scenes || [])].filter(Boolean);
				const root = scenes.find(hasMesh);
				for (const s of new Set(scenes)) if (s !== root) disposeTree(s);
				if (root) mount(root, false);
				else mount(placeholder(), true);
			},
			undefined,
			() => mount(placeholder(), true),
		);
	}

	bind() {
		const el = this.canvas;
		let last = null;
		this.onDown = (e) => {
			if (e.pointerType === "mouse" && e.button !== 0) return;
			el.setPointerCapture?.(e.pointerId);
			last = e.clientX;
			el.style.cursor = "grabbing";
		};
		this.onMove = (e) => {
			if (last == null) return;
			const dx = e.clientX - last;
			last = e.clientX;
			this.turnBy(-dx * 0.55);
		};
		this.onUp = () => {
			last = null;
			el.style.cursor = "grab";
		};
		el.addEventListener("pointerdown", this.onDown);
		el.addEventListener("pointermove", this.onMove);
		el.addEventListener("pointerup", this.onUp);
		el.addEventListener("pointercancel", this.onUp);
		this.ro = new ResizeObserver(() => this.resize());
		this.ro.observe(this.container);
	}

	resize() {
		if (this.disposed) return;
		const w = Math.max(1, this.container.clientWidth);
		const h = Math.max(1, this.container.clientHeight);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		// keep the whole piece in frame in a narrow canvas
		const fit = 1.25 / Math.sin((this.camera.fov * DEG) / 2);
		const dist = Math.max(fit, fit / Math.min(1, this.camera.aspect));
		this.camera.position.set(0.9, 0.7, 4.3).normalize().multiplyScalar(dist);
		this.camera.lookAt(0, 0, 0);
		this.camera.updateProjectionMatrix();
		this.invalidate();
	}

	// Positive degrees turn the piece anticlockwise as the player sees it.
	turnBy(deg) {
		if (this.snapped || !this.loaded) return;
		this.angle = wrap(this.angle + deg);
		if (Math.abs(this.angle) <= this.snapDeg) {
			this.snapped = true;
			this.settle = this.reduced ? null : { from: this.angle, t0: performance.now(), dur: 260 };
			this.angle = 0;
		}
		this.apply();
		this.emit();
	}

	stepLeft() {
		this.turnBy(this.step);
	}

	stepRight() {
		this.turnBy(-this.step);
	}

	apply(shown = this.angle) {
		this.pivot.quaternion.setFromAxisAngle(this.axis, shown * DEG);
		this.ghost.visible = !this.snapped;
		this.invalidate();
	}

	emit() {
		this.onState({ loaded: this.loaded, placeholder: this.isPlaceholder, snapped: this.snapped, angle: this.angle });
	}

	invalidate() {
		if (this.raf || this.disposed) return;
		this.raf = requestAnimationFrame(this.frame);
	}

	frame(now) {
		this.raf = 0;
		if (this.disposed) return;
		if (this.settle) {
			const t = clamp((now - this.settle.t0) / this.settle.dur, 0, 1);
			const e = t * t * (3 - 2 * t);
			this.pivot.quaternion.setFromAxisAngle(this.axis, this.settle.from * (1 - e) * DEG);
			if (t >= 1) this.settle = null;
			else this.invalidate();
		}
		this.renderer.render(this.scene, this.camera);
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		cancelAnimationFrame(this.raf);
		this.ro.disconnect();
		const el = this.canvas;
		el.removeEventListener("pointerdown", this.onDown);
		el.removeEventListener("pointermove", this.onMove);
		el.removeEventListener("pointerup", this.onUp);
		el.removeEventListener("pointercancel", this.onUp);
		disposeTree(this.pivot);
		this.ghostMat.dispose();
		this.renderer.dispose();
		this.renderer.forceContextLoss();
		el.remove();
	}
}
