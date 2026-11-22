// The open-world runtime: loads a world.json, runs the player, people, rides, camera and era.
// Plain three.js and Rapier in a class, hosted by a React Three Fiber canvas. It has no
// site-specific code: everything it places comes from world.json and missions.json.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CLASS_IDS, createBakedMaterial, createWorldUniforms } from "@/lib/play/world/bakedMaterial";

const WALK = 2.1, RUN = 5.0;
const CART_SPEED = 3.6, CART_TURN = 0.9;
const INTERACT_RANGE = 3.0, RIDE_RANGE = 4.6;
const ERA_SECONDS = 2.6, RESTORE_SECONDS = 3.4;
const GRAVITY = -16;

// Blender metres (x, y) to the web's (x, z).
export const toScene = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

const SKY_FRAG = /* glsl */ `
precision highp float;
uniform float uEra; uniform vec3 uSun; varying vec3 vDir;
void main() {
	vec3 d = normalize(vDir);
	float h = clamp(d.y, -0.05, 1.0);
	vec3 thenSky = mix(vec3(1.0, 0.58, 0.34), mix(vec3(0.86, 0.42, 0.52), vec3(0.20, 0.25, 0.48), smoothstep(0.08, 0.62, h)), smoothstep(0.0, 0.16, h));
	vec3 nowSky = mix(vec3(0.82, 0.86, 0.87), vec3(0.42, 0.60, 0.76), smoothstep(0.0, 0.55, h));
	vec3 c = mix(nowSky, thenSky, uEra);
	float s = max(dot(d, uSun), 0.0);
	c += mix(vec3(0.0), vec3(1.0, 0.62, 0.28) * (pow(s, 7.0) * 0.5 + pow(s, 90.0) * 0.9) + vec3(1.0, 0.92, 0.75) * smoothstep(0.9993, 0.9997, s) * 2.4, uEra);
	gl_FragColor = vec4(c, 1.0);
	#include <colorspace_fragment>
}`;

export class WorldRuntime {
	constructor({ world, missions, base, preset, callbacks = {} }) {
		this.world = world;
		this.missions = missions;
		this.base = base;
		this.preset = preset;
		this.cb = callbacks;
		this.root = new THREE.Group();
		this.uniforms = createWorldUniforms();
		this.groundY = world.ground_y;
		this.people = [];
		this.storyNpcs = new Map();
		this.rides = new Map();
		this.records = new Map();
		this.colliderTris = [];
		this.riding = null;
		this.blocked = false; // true while a card or dialogue holds the player still
		this.objective = null;
		this.yaw = 0;
		this.pitch = -0.12;
		this.camDist = 4.4;
		this.velY = 0;
		this.speed = 0;
		this.facing = 0;
		this.eraMix = 0;
		this.eraAnim = null;
		this.restoreAnim = null;
		this.time = 0;
		this.pos = new THREE.Vector3();
		this._v = new THREE.Vector3();
		this._w = new THREE.Vector3();
		this.prompt = null;
		this.ready = false;
	}

	url(path) {
		return `${this.base}/${path}`;
	}

	// Once only: React runs effects twice in development.
	loadOnce(renderer, onProgress) {
		this._loading ??= this.load(renderer, onProgress);
		return this._loading;
	}

	attachOnce(world, R) {
		if (this.phys === world) return;
		this.attachPhysics(world, R);
	}

	// A card or dialogue holds the player still.
	hold(on) {
		this.blocked = !!on;
	}

	async load(renderer, onProgress = () => {}) {
		const ktx = new KTX2Loader().setTranscoderPath("/virtual/basis/").detectSupport(renderer);
		this.ktx = ktx;
		const gltf = new GLTFLoader().setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);
		this.gltf = gltf;
		const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
		const size = this.preset.atlas === "large" ? 1 : 0;

		const cell = this.world.cells[this.world.start_cell];
		const jobs = [];
		const tex = (name) => {
			const sizes = cell.textures[name];
			const px = sizes[Math.min(size, sizes.length - 1)];
			return ktx.loadAsync(this.url(`${cell.id}/tex/${name}_${px}.ktx2`)).then((t) => {
				t.colorSpace = THREE.SRGBColorSpace;
				t.anisotropy = anisotropy;
				t.flipY = false;
				return t;
			});
		};
		let done = 0;
		const groups = Object.entries(cell.groups);
		const total = groups.length + 3;
		const step = () => onProgress(++done / total);

		for (const [name, g] of groups) {
			jobs.push(
				(async () => {
					const [model, now, then] = await Promise.all([
						gltf.loadAsync(this.url(`${cell.id}/${name}.glb`)),
						tex(g.now),
						g.then ? tex(g.then) : null,
					]);
					const material = createBakedMaterial(this.uniforms, { now, then, mode: g.mode, classes: !!g.classes, doubleSide: true });
					model.scene.traverse((o) => {
						if (o.isMesh) {
							o.material = material;
							o.frustumCulled = name !== "ground";
							if (g.collide) this._collectTris(o, g.collide_min_area ?? 0.03);
						}
					});
					this.root.add(model.scene);
					step();
				})(),
			);
		}
		jobs.push(this._loadPlayer().then(step));
		jobs.push(this._loadFigures().then(step));
		jobs.push(this._loadRides().then(step));
		await Promise.all(jobs);
		this._buildSky();
		this._buildLights();
		this._buildMarkers();
		this._buildToday();
		this._loadCards(anisotropy); // streams in after the first view
		this.ready = true;
	}

	_collectTris(mesh, minArea) {
		mesh.updateWorldMatrix(true, false);
		const pos = mesh.geometry.attributes.position;
		const idx = mesh.geometry.index;
		const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
		const tri = new THREE.Triangle();
		const out = [];
		const count = idx ? idx.count : pos.count;
		for (let i = 0; i < count; i += 3) {
			const [ia, ib, ic] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
			a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
			b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
			c.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
			tri.set(a, b, c);
			if (tri.getArea() < minArea) continue;
			out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
		}
		this.colliderTris.push(new Float32Array(out));
	}

	async _loadPlayer() {
		const g = await this.gltf.loadAsync(this.url(`actors/${this.world.actors.player}.glb`));
		const model = g.scene;
		model.traverse((o) => {
			if (o.isSkinnedMesh) {
				o.material = new THREE.MeshLambertMaterial({ vertexColors: true });
				o.frustumCulled = false;
				o.castShadow = true;
			}
		});
		this.player = new THREE.Group();
		this.player.add(model);
		this.root.add(this.player);
		this.mixer = new THREE.AnimationMixer(model);
		this.actions = Object.fromEntries(g.animations.map((c) => [c.name, this.mixer.clipAction(c)]));
		this.actions.idle?.play();
		this.current = "idle";
		this.player.add(this._blob(0.55));
	}

	_play(name, fade = 0.22) {
		if (this.current === name || !this.actions[name]) return;
		const next = this.actions[name];
		next.reset().setEffectiveWeight(1).fadeIn(fade).play();
		this.actions[this.current]?.fadeOut(fade);
		this.current = name;
	}

	_blob(radius) {
		if (!this.blobTexture) {
			const c = document.createElement("canvas");
			c.width = c.height = 64;
			const x = c.getContext("2d");
			const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
			g.addColorStop(0, "rgba(20,8,20,0.62)");
			g.addColorStop(1, "rgba(20,8,20,0)");
			x.fillStyle = g;
			x.fillRect(0, 0, 64, 64);
			this.blobTexture = new THREE.CanvasTexture(c);
		}
		const m = new THREE.Mesh(
			new THREE.PlaneGeometry(radius * 2.6, radius * 2),
			new THREE.MeshBasicMaterial({ map: this.blobTexture, transparent: true, depthWrite: false, toneMapped: false }),
		);
		m.rotation.x = -Math.PI / 2;
		m.position.y = 0.035;
		m.renderOrder = 2;
		return m;
	}

	async _loadFigures() {
		const ids = [...new Set([...this.missions.npcs.map((n) => n.figure), ...(this.world.people || []).map((p) => p.figure)])];
		const loaded = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await this.gltf.loadAsync(this.url(`actors/${id}.glb`))])));
		this.figures = loaded;
		const make = (figure) => {
			const g = loaded[figure];
			const model = cloneSkinned(g.scene);
			model.traverse((o) => {
				if (o.isSkinnedMesh) {
					const map = o.material.map;
					o.material = new THREE.MeshLambertMaterial({ map });
					o.frustumCulled = false;
					o.castShadow = true;
				}
			});
			const mixer = new THREE.AnimationMixer(model);
			const actions = Object.fromEntries(g.animations.map((c) => [c.name, mixer.clipAction(c)]));
			const group = new THREE.Group();
			group.add(model, this._blob(0.5));
			this.root.add(group);
			return { group, mixer, actions, clip: null };
		};
		for (const n of this.missions.npcs) {
			const a = make(n.figure);
			a.group.position.copy(toScene(n.at, this.groundY));
			a.group.rotation.y = THREE.MathUtils.degToRad(n.face_deg ?? 0);
			a.baseYaw = a.group.rotation.y;
			this._clip(a, "idle");
			a.era = n.era || "1791";
			this.storyNpcs.set(n.id, { ...a, spec: n });
		}
		const routes = (this.world.people || []).slice(0, this.preset.people);
		routes.forEach((p, i) => {
			const a = make(p.figure);
			const route = p.route.map((q) => toScene(q, this.groundY));
			a.group.position.copy(route[0]);
			Object.assign(a, { route, leg: 1, dir: 1, wait: 1 + (i % 4), side: 0, speed: p.speed || 1.15 + (i % 3) * 0.08 });
			this._clip(a, "idle");
			a.mixer.setTime(i * 0.37);
			this.people.push(a);
		});
	}

	_clip(a, name, fade = 0.25) {
		if (a.clip === name || !a.actions[name]) return;
		a.actions[name].reset().fadeIn(a.clip ? fade : 0).play();
		if (a.clip) a.actions[a.clip]?.fadeOut(fade);
		a.clip = name;
	}

	async _loadRides() {
		const specs = this.missions.rides || [];
		const models = {};
		for (const s of specs) {
			const file = this.world.actors.rides?.[s.type];
			if (!file) continue;
			models[s.type] ??= await this.gltf.loadAsync(this.url(`actors/${file.id}.glb`));
			const inner = models[s.type].scene.clone(true);
			inner.traverse((o) => {
				if (o.isMesh) {
					o.material = new THREE.MeshLambertMaterial({ map: o.material.map });
					o.castShadow = true;
				}
			});
			inner.scale.setScalar(file.scale || 1);
			inner.rotation.y = THREE.MathUtils.degToRad(file.yaw || 0);
			const box = new THREE.Box3().setFromObject(inner);
			inner.position.y -= box.min.y;
			const rocker = new THREE.Group();
			rocker.add(inner);
			const group = new THREE.Group();
			group.add(rocker, this._blob(2.2));
			group.position.copy(toScene(s.at, this.groundY));
			group.rotation.y = THREE.MathUtils.degToRad(s.face_deg ?? 0);
			this.root.add(group);
			this.rides.set(s.id, { spec: s, group, rocker, seat: file.seat || [0, 1.3, -0.6], heading: group.rotation.y, v: 0, phase: 0 });
		}
	}

	_buildSky() {
		const mat = new THREE.ShaderMaterial({
			side: THREE.BackSide,
			depthWrite: false,
			toneMapped: false,
			uniforms: { uEra: { value: 0 }, uSun: { value: new THREE.Vector3(...this.world.sun).normalize() } },
			vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0); gl_Position = p.xyww; }",
			fragmentShader: SKY_FRAG,
		});
		this.sky = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 16), mat);
		this.sky.frustumCulled = false;
		this.sky.renderOrder = -10;
		this.root.add(this.sky);
	}

	_buildLights() {
		this.hemi = new THREE.HemisphereLight("#ffd9b0", "#6b4a3c", 1.5);
		this.sun = new THREE.DirectionalLight("#ffb873", 2.6);
		const dir = new THREE.Vector3(...this.world.sun).normalize();
		this.sunDir = dir;
		this.sun.position.copy(dir).multiplyScalar(60);
		this.root.add(this.hemi, this.sun, this.sun.target);
		if (this.preset.shadows) {
			this.sun.castShadow = true;
			this.sun.shadow.mapSize.set(1024, 1024);
			const c = this.sun.shadow.camera;
			c.left = c.bottom = -16;
			c.right = c.top = 16;
			c.near = 1;
			c.far = 130;
			this.sun.shadow.bias = -0.0006;
			this.shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.ShadowMaterial({ opacity: 0.42, color: "#1c0d22" }));
			this.shadowPlane.rotation.x = -Math.PI / 2;
			this.shadowPlane.receiveShadow = true;
			this.shadowPlane.renderOrder = 1;
			this.root.add(this.shadowPlane);
		}
	}

	_buildMarkers() {
		const beamMat = new THREE.ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
			blending: THREE.AdditiveBlending,
			toneMapped: false,
			uniforms: { uTime: this.uniforms.uTime },
			vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
			fragmentShader: "uniform float uTime; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.7) * (0.55 + 0.1 * sin(uTime * 2.4)); gl_FragColor = vec4(vec3(1.0, 0.56, 0.26) * a, a); }",
		});
		this.beacon = new THREE.Group();
		const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 20, 1, true), beamMat);
		beam.position.y = 8;
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.05, 40), new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.06;
		this.beacon.add(beam, ring);
		this.beacon.visible = false;
		this.root.add(this.beacon);

		for (const r of this.missions.records || []) {
			const mat = new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false });
			const m = new THREE.Mesh(r.kind === "stone" ? new THREE.BoxGeometry(0.55, 0.72, 0.1) : new THREE.BoxGeometry(0.42, 0.07, 0.3), mat);
			const g = new THREE.Group();
			g.add(m);
			m.position.y = 1.05;
			g.position.copy(toScene(r.at, this.groundY));
			g.visible = false;
			this.root.add(g);
			this.records.set(r.id, { spec: r, group: g, mesh: m });
		}
	}

	_buildToday() {
		const spec = this.world.today?.blocks;
		if (!spec) return;
		const mat = createBakedMaterial(this.uniforms, { now: this._flatTexture(), mode: "now" });
		const geo = new THREE.BoxGeometry(1, 1, 1);
		geo.setAttribute("_class", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
		geo.translate(0, 0.5, 0);
		const mesh = new THREE.InstancedMesh(geo, mat, spec.count);
		const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
		const up = new THREE.Vector3(0, 1, 0);
		let seed = spec.seed || 7;
		const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		for (let i = 0; i < spec.count; i++) {
			const a = rnd() * Math.PI * 2, r = spec.inner + (spec.outer - spec.inner) * Math.sqrt(rnd());
			p.set(spec.center[0] + Math.cos(a) * r, this.groundY, -(spec.center[1] + Math.sin(a) * r));
			q.setFromAxisAngle(up, rnd() * Math.PI);
			s.set(9 + rnd() * 18, 7 + rnd() * rnd() * 46, 9 + rnd() * 18);
			mesh.setMatrixAt(i, m.compose(p, q, s));
		}
		mesh.frustumCulled = false;
		this.root.add(mesh);
	}

	_flatTexture() {
		const t = new THREE.DataTexture(new Uint8Array([168, 170, 172, 255]), 1, 1);
		t.colorSpace = THREE.SRGBColorSpace;
		t.needsUpdate = true;
		return t;
	}

	async _loadCards(anisotropy) {
		const cards = this.world.cards || {};
		const up = new THREE.Vector3(0, 1, 0);
		for (const [key, c] of Object.entries(cards)) {
			try {
				const load = (view) => this.ktx.loadAsync(this.url(`cards/${key}_${view}.ktx2`));
				const [front, side] = await Promise.all([load("front"), load("side")]);
				for (const [t, yaw] of [[front, 0], [side, Math.PI / 2]]) {
					t.colorSpace = THREE.SRGBColorSpace;
					t.anisotropy = anisotropy;
					const mat = createBakedMaterial(this.uniforms, { now: t, mode: "then", cutout: true });
					const geo = new THREE.PlaneGeometry(c.width, c.height);
					geo.translate(0, c.height / 2, 0);
					geo.rotateY(yaw);
					geo.setAttribute("_class", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
					const list = c.at.filter((_, i) => i % Math.round(1 / this.preset.cards) === 0);
					const mesh = new THREE.InstancedMesh(geo, mat, list.length);
					const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
					list.forEach((a, i) => {
						p.set(a.x, a.z + c.base_z, -a.y);
						q.setFromAxisAngle(up, a.yaw);
						s.setScalar(a.scale || 1);
						mesh.setMatrixAt(i, m.compose(p, q, s));
					});
					mesh.frustumCulled = false;
					this.root.add(mesh);
				}
			} catch {
				// A missing tree card leaves the world playable.
			}
		}
	}

	// ---------------------------------------------------------------- physics

	attachPhysics(world, R) {
		this.phys = world;
		this.R = R;
		const b = this.world.play_bounds;
		const cx = (b[0] + b[2]) / 2, cz = -(b[1] + b[3]) / 2;
		world.createCollider(R.ColliderDesc.cuboid((b[2] - b[0]) / 2 + 40, 0.5, (b[3] - b[1]) / 2 + 40).setTranslation(cx, this.groundY - 0.5, cz));
		for (const tris of this.colliderTris) {
			if (!tris.length) continue;
			const indices = new Uint32Array(tris.length / 3);
			for (let i = 0; i < indices.length; i++) indices[i] = i;
			world.createCollider(R.ColliderDesc.trimesh(tris, indices));
		}
		this.colliderTris = [];
		const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y + 0.95, this.pos.z));
		this.body = body;
		this.collider = world.createCollider(R.ColliderDesc.capsule(0.6, 0.3), body);
		const kcc = world.createCharacterController(0.04);
		kcc.setUp({ x: 0, y: 1, z: 0 });
		kcc.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(50));
		kcc.enableAutostep(0.42, 0.18, true);
		kcc.enableSnapToGround(0.42);
		kcc.setApplyImpulsesToDynamicBodies(false);
		this.kcc = kcc;
	}

	teleport(p, faceDeg = null) {
		const v = toScene(p, this.groundY);
		this.pos.copy(v);
		this.body?.setNextKinematicTranslation({ x: v.x, y: v.y + 0.95, z: v.z });
		this.body?.setTranslation({ x: v.x, y: v.y + 0.95, z: v.z }, true);
		this.player.position.copy(v);
		if (faceDeg != null) {
			this.yaw = THREE.MathUtils.degToRad(faceDeg);
			this.facing = this.yaw;
			this.player.rotation.y = this.yaw + Math.PI;
		}
		this.velY = 0;
	}

	// ---------------------------------------------------------------- era and restoration

	setEra(era) {
		const v = era === "1791" ? 1 : 0;
		this.uniforms.uFrom.value = v;
		this.uniforms.uTo.value = v;
		this.uniforms.uRadius.value = 0;
		this.eraMix = v;
		this.era = era;
		this._applyEraLook();
	}

	shiftEra(to, onDone) {
		const u = this.uniforms;
		u.uFrom.value = this.era === "1791" ? 1 : 0;
		u.uTo.value = to === "1791" ? 1 : 0;
		u.uRadius.value = 0;
		u.uCenter.value.copy(this.pos);
		this.eraAnim = { t: 0, to, from: u.uFrom.value, onDone, reach: this.world.era_reach || 620 };
	}

	_applyEraLook() {
		const k = this.eraMix;
		if (this.sky) this.sky.material.uniforms.uEra.value = k;
		if (this.hemi) {
			this.hemi.color.set("#dfe7ec").lerp(new THREE.Color("#ffd2a4"), k);
			this.hemi.groundColor.set("#7e8378").lerp(new THREE.Color("#6e4638"), k);
			this.hemi.intensity = THREE.MathUtils.lerp(1.9, 1.5, k);
		}
		if (this.sun) {
			this.sun.color.set("#fff4e6").lerp(new THREE.Color("#ffa964"), k);
			this.sun.intensity = THREE.MathUtils.lerp(1.3, 2.8, k);
		}
		const in1791 = k > 0.5;
		for (const n of this.storyNpcs.values()) n.group.visible = (n.era === "1791") === in1791;
		for (const p of this.people) p.group.visible = in1791;
		for (const r of this.rides.values()) r.group.visible = in1791;
	}

	setResolved(classes, instant = true) {
		const v = this.uniforms.uResolved.value;
		for (const c of classes) if (CLASS_IDS[c]) v[CLASS_IDS[c]] = 1;
		if (instant) this.uniforms.uResolveY.value = 40;
	}

	restore(classes, onDone) {
		this.setResolved(classes, false);
		this.uniforms.uResolveY.value = this.groundY - 1.4;
		this.restoreAnim = { t: 0, onDone };
	}

	showRecord(id, on) {
		const r = this.records.get(id);
		if (r) r.group.visible = on;
	}

	setObjective(obj, waypoint) {
		this.objective = obj;
		this.waypoint = waypoint;
		this._arrived = false;
		this.beacon.visible = !!waypoint;
		if (waypoint) this.beacon.position.copy(toScene(waypoint, this.groundY));
		for (const r of this.records.values()) r.group.visible = obj?.kind === "record" && obj.record === r.spec.id;
	}

	// ---------------------------------------------------------------- interaction

	_findPrompt() {
		if (this.blocked) return null;
		if (this.riding) return { kind: "leave", label: "Get down" };
		let best = null, bestD = Infinity;
		const consider = (kind, id, label, at, range) => {
			const d = Math.hypot(at.x - this.pos.x, at.z - this.pos.z);
			if (d < range && d < bestD) {
				best = { kind, id, label };
				bestD = d;
			}
		};
		for (const [id, n] of this.storyNpcs) if (n.group.visible) consider("npc", id, `Talk to ${n.spec.role.toLowerCase()}`, n.group.position, INTERACT_RANGE);
		for (const [id, r] of this.records) if (r.group.visible) consider("record", id, `Read ${r.spec.title}`, r.group.position, INTERACT_RANGE);
		for (const [id, r] of this.rides) if (r.group.visible) consider("ride", id, `Ride the ${r.spec.label.toLowerCase()}`, r.group.position, RIDE_RANGE);
		return best;
	}

	mountRide(id) {
		const r = this.rides.get(id);
		if (!r) return;
		this.riding = id;
		r.v = 0;
		this.yaw = r.heading;
		this._play("sit");
		this.cb.onRide?.(id);
	}

	dismount() {
		const r = this.rides.get(this.riding);
		if (!r) return;
		const side = new THREE.Vector3(Math.cos(r.heading), 0, -Math.sin(r.heading)).multiplyScalar(2.2);
		const p = r.group.position.clone().add(side);
		this.riding = null;
		this.player.position.copy(p).setY(this.groundY);
		this.teleport([p.x, -p.z]);
		this._play("idle");
		this.cb.onRide?.(null);
	}

	faceNpc(id, on) {
		const n = this.storyNpcs.get(id);
		if (!n) return;
		n.facingPlayer = on;
		this._clip(n, on ? "talk" : "idle");
	}

	_rideBlocked(x, z) {
		const b = this.world.play_bounds;
		const by = -z;
		if (x < b[0] + 3 || x > b[2] - 3 || by < b[1] + 3 || by > b[3] - 3) return true;
		for (const q of this.world.no_ride || []) if (x > q[0] && x < q[2] && by > q[1] && by < q[3]) return true;
		return false;
	}

	// ---------------------------------------------------------------- the frame

	tick(rawDt, camera, input) {
		if (!this.ready || !this.kcc) return;
		const dt = Math.min(rawDt, 0.05);
		this.time += dt;
		this.uniforms.uTime.value = this.time;
		input.poll(dt);
		const [lx, ly] = input.takeLook();
		this.yaw += lx;
		this.pitch = THREE.MathUtils.clamp(this.pitch + ly, -0.75, 0.62);

		if (input.consume("map")) this.cb.onMap?.();
		const prompt = this._findPrompt();
		if (prompt?.kind !== this.prompt?.kind || prompt?.id !== this.prompt?.id) {
			this.prompt = prompt;
			this.cb.onPrompt?.(prompt);
		}
		if (input.consume("interact") && prompt) {
			if (prompt.kind === "ride") this.mountRide(prompt.id);
			else if (prompt.kind === "leave") this.dismount();
			else this.cb.onInteract?.(prompt);
		}

		if (this.riding) this._stepRide(dt, input);
		else this._stepPlayer(dt, input);
		this._stepPeople(dt);
		for (const n of this.storyNpcs.values()) {
			if (!n.group.visible) continue;
			n.mixer.update(dt);
			const want = n.facingPlayer ? Math.atan2(this.pos.x - n.group.position.x, this.pos.z - n.group.position.z) : n.baseYaw;
			n.group.rotation.y += angleTo(n.group.rotation.y, want) * Math.min(1, dt * 5);
		}
		this.mixer.update(dt);
		this._stepAnims(dt);
		this._stepCamera(dt, camera);
		this._checkArrival();
		if (this.shadowPlane) {
			this.shadowPlane.position.set(this.pos.x, this.groundY + 0.03, this.pos.z);
			this.sun.target.position.copy(this.pos);
			this.sun.position.copy(this.pos).addScaledVector(this.sunDir, 60);
		}
		if (this.beacon.visible) this.beacon.rotation.y += dt * 0.4;
		for (const r of this.records.values()) if (r.group.visible) r.mesh.rotation.y += dt * 0.9;
	}

	_stepPlayer(dt, input) {
		const { moveX, moveY, run } = input.state;
		const moving = !this.blocked && Math.hypot(moveX, moveY) > 0.05;
		const target = moving ? (run ? RUN : WALK) * Math.min(1, Math.hypot(moveX, moveY) * 1.2) : 0;
		this.speed = damp(this.speed, target, 11, dt);
		if (moving) {
			// Camera yaw 0 looks along -Z. Stick up walks away from the camera.
			this.facing = this.yaw + Math.atan2(-moveX, moveY);
		}
		const dx = -Math.sin(this.facing) * this.speed * dt;
		const dz = -Math.cos(this.facing) * this.speed * dt;
		this.velY = this.kcc.computedGrounded?.() ? -1 : this.velY + GRAVITY * dt;

		// Soft push away from people, so nobody is ever walked through.
		let px = 0, pz = 0;
		for (const a of [...this.people, ...this.storyNpcs.values()]) {
			if (!a.group.visible) continue;
			const ox = this.pos.x - a.group.position.x, oz = this.pos.z - a.group.position.z;
			const d = Math.hypot(ox, oz);
			if (d > 0.001 && d < 0.72) {
				px += (ox / d) * (0.72 - d) * 0.35;
				pz += (oz / d) * (0.72 - d) * 0.35;
			}
		}
		this.kcc.computeColliderMovement(this.collider, { x: dx + px, y: this.velY * dt, z: dz + pz });
		const m = this.kcc.computedMovement();
		const t = this.body.translation();
		const b = this.world.play_bounds;
		const nx = THREE.MathUtils.clamp(t.x + m.x, b[0], b[2]);
		const nz = THREE.MathUtils.clamp(t.z + m.z, -b[3], -b[1]);
		const ny = Math.max(t.y + m.y, this.groundY + 0.93);
		this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
		this.pos.set(nx, ny - 0.93, nz);
		this.player.position.copy(this.pos);
		this.player.rotation.y += angleTo(this.player.rotation.y, this.facing + Math.PI) * Math.min(1, dt * 12);
		this._play(this.speed < 0.25 ? "idle" : this.speed < 3.2 ? "walk" : "run");
		if (this.actions.run && this.current === "run") this.actions.run.timeScale = this.speed / RUN;
		if (this.actions.walk && this.current === "walk") this.actions.walk.timeScale = Math.max(0.6, this.speed / WALK);
	}

	_stepRide(dt, input) {
		const r = this.rides.get(this.riding);
		const { moveX, moveY } = input.state;
		const want = this.blocked ? 0 : Math.max(-0.3, moveY) * CART_SPEED;
		r.v = damp(r.v, want, 1.8, dt);
		const turn = this.blocked ? 0 : -moveX * CART_TURN * Math.min(1, Math.abs(r.v) / 1.2) * Math.sign(r.v || 1);
		r.heading += turn * dt;
		const fx = -Math.sin(r.heading), fz = -Math.cos(r.heading);
		const nx = r.group.position.x + fx * r.v * dt, nz = r.group.position.z + fz * r.v * dt;
		// A ride stops for anyone in front of it, and never enters the palace or its platform.
		let clear = !this._rideBlocked(nx + fx * 2.6 * Math.sign(r.v || 1), nz + fz * 2.6 * Math.sign(r.v || 1));
		for (const a of this.people) {
			if (!a.group.visible) continue;
			const ox = a.group.position.x - r.group.position.x, oz = a.group.position.z - r.group.position.z;
			const ahead = ox * fx * Math.sign(r.v || 1) + oz * fz * Math.sign(r.v || 1);
			if (ahead > 0 && ahead < 4.2 && Math.abs(ox * fz - oz * fx) < 1.5) clear = false;
		}
		if (clear) {
			r.group.position.x = nx;
			r.group.position.z = nz;
		} else {
			r.v = 0;
		}
		r.group.rotation.y = r.heading;
		r.phase += Math.abs(r.v) * dt * 3.4;
		r.rocker.rotation.z = Math.sin(r.phase) * 0.018 * Math.min(1, Math.abs(r.v));
		r.rocker.rotation.x = Math.sin(r.phase * 0.5) * 0.012 * Math.min(1, Math.abs(r.v));
		r.rocker.position.y = Math.abs(Math.sin(r.phase)) * 0.025;
		this._v.set(...r.seat).applyAxisAngle(THREE.Object3D.DEFAULT_UP, r.heading).add(r.group.position);
		this.pos.set(r.group.position.x, this.groundY, r.group.position.z);
		this.player.position.copy(this._v);
		this.player.rotation.y = r.heading + Math.PI;
		this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.groundY + 3, z: this.pos.z });
		this.yaw += angleTo(this.yaw, r.heading) * Math.min(1, dt * (Math.abs(r.v) > 0.3 ? 1.6 : 0));
	}

	_stepPeople(dt) {
		for (const a of this.people) {
			if (!a.group.visible) continue;
			const dPlayer = Math.hypot(a.group.position.x - this.pos.x, a.group.position.z - this.pos.z);
			if (dPlayer < 60) a.mixer.update(dt);
			if (a.wait > 0) {
				a.wait -= dt;
				this._clip(a, "idle");
				continue;
			}
			const target = a.route[a.leg];
			this._v.copy(target).sub(a.group.position).setY(0);
			const d = this._v.length();
			if (d < 0.3) {
				if (a.leg + a.dir >= a.route.length || a.leg + a.dir < 0) a.dir *= -1;
				a.leg += a.dir;
				a.wait = 1.5 + Math.random() * 3;
				continue;
			}
			this._v.divideScalar(d);
			// Step aside for the player and for any ride.
			let sidestep = 0;
			const threats = [{ x: this.pos.x, z: this.pos.z, r: 1.6 }];
			for (const r of this.rides.values()) threats.push({ x: r.group.position.x, z: r.group.position.z, r: 4.2 });
			for (const t of threats) {
				const ox = t.x - a.group.position.x, oz = t.z - a.group.position.z;
				const dist = Math.hypot(ox, oz);
				if (dist < t.r) sidestep += (this._v.x * oz - this._v.z * ox >= 0 ? -1 : 1) * (1 - dist / t.r);
			}
			a.side = damp(a.side, THREE.MathUtils.clamp(sidestep * 1.8, -1.4, 1.4), 6, dt);
			const vx = this._v.x * a.speed - this._v.z * a.side;
			const vz = this._v.z * a.speed + this._v.x * a.side;
			a.group.position.x += vx * dt;
			a.group.position.z += vz * dt;
			a.group.rotation.y += angleTo(a.group.rotation.y, Math.atan2(vx, vz)) * Math.min(1, dt * 6);
			this._clip(a, "walk");
		}
	}

	_stepAnims(dt) {
		const e = this.eraAnim;
		if (e) {
			e.t += dt / ERA_SECONDS;
			const k = Math.min(1, e.t);
			const eased = k < 0.12 ? 0 : Math.pow((k - 0.12) / 0.88, 2.1);
			this.uniforms.uRadius.value = eased * e.reach;
			this.eraMix = THREE.MathUtils.lerp(e.from, e.to === "1791" ? 1 : 0, THREE.MathUtils.smoothstep(k, 0.2, 0.8));
			this._applyEraLook();
			if (k >= 1) {
				this.eraAnim = null;
				this.setEra(e.to);
				e.onDone?.();
			}
		}
		const r = this.restoreAnim;
		if (r) {
			r.t += dt / RESTORE_SECONDS;
			const k = Math.min(1, r.t);
			this.uniforms.uResolveY.value = THREE.MathUtils.lerp(this.groundY - 1.4, this.world.resolve_top ?? 11, k * k * (3 - 2 * k));
			if (k >= 1) {
				this.restoreAnim = null;
				this.uniforms.uResolveY.value = 40;
				r.onDone?.();
			}
		}
	}

	_stepCamera(dt, camera) {
		const riding = !!this.riding;
		const dist = riding ? 7.6 : this.camDist;
		const head = this._v.set(this.pos.x, this.pos.y + (riding ? 2.7 : 1.55), this.pos.z);
		const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
		const back = this._w.set(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
		const right = riding ? 0 : 0.42;
		const shoulder = new THREE.Vector3(head.x + Math.cos(this.yaw) * right, head.y, head.z - Math.sin(this.yaw) * right);
		let reach = dist;
		if (this.phys && !riding) {
			const ray = new this.R.Ray({ x: shoulder.x, y: shoulder.y, z: shoulder.z }, { x: back.x, y: back.y, z: back.z });
			const hit = this.phys.castRay(ray, dist, true, undefined, undefined, this.collider, this.body);
			if (hit) reach = Math.max(0.75, hit.timeOfImpact - 0.22);
		}
		this.camReach = this.camReach == null ? reach : reach < this.camReach ? reach : damp(this.camReach, reach, 5, dt);
		camera.position.copy(shoulder).addScaledVector(back, this.camReach);
		camera.position.y = Math.max(camera.position.y, this.groundY + 0.25);
		camera.lookAt(shoulder.x - back.x * 6, shoulder.y - back.y * 6, shoulder.z - back.z * 6);
		const fov = riding ? 62 : THREE.MathUtils.lerp(58, 66, Math.min(1, this.speed / RUN));
		if (Math.abs(camera.fov - fov) > 0.05) {
			camera.fov = damp(camera.fov, fov, 4, dt);
			camera.updateProjectionMatrix();
		}
	}

	_checkArrival() {
		const o = this.objective;
		if (!o || this._arrived) return;
		if (o.kind !== "goto" && o.kind !== "ride") return;
		if (o.kind === "ride" && this.riding !== o.ride) return;
		const p = toScene(o.at, this.groundY);
		if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) <= (o.radius || 4)) {
			this._arrived = true;
			this.cb.onArrive?.(o, this.riding);
		}
	}

	hud() {
		return {
			x: this.pos.x,
			y: -this.pos.z,
			yaw: this.riding ? this.rides.get(this.riding).heading : this.facing,
			camYaw: this.yaw,
			riding: this.riding,
			waypoint: this.waypoint || null,
			rides: [...this.rides.values()].filter((r) => r.group.visible).map((r) => [r.group.position.x, -r.group.position.z]),
			records: [...this.records.values()].filter((r) => r.group.visible).map((r) => r.spec.at),
			people: [...this.storyNpcs.values()].filter((n) => n.group.visible).map((n) => n.spec.at),
		};
	}

	dispose() {
		this.ktx?.dispose();
		this.root.traverse((o) => {
			o.geometry?.dispose?.();
			const m = o.material;
			if (m) (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose?.());
		});
	}
}
