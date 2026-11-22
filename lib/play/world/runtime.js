// The open-world runtime: loads a world.json, runs the player, people, rides, camera and era.
// Plain three.js and Rapier in a class, hosted by a React Three Fiber canvas. It has no
// site-specific code: everything it places comes from world.json and missions.json.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CLASS_IDS, createBakedMaterial, createDetailTexture, createWorldUniforms, RESOLVED_Y } from "@/lib/play/world/bakedMaterial";
import { allowsRoaming, pastEraOf } from "@/lib/play/world/missions";
import { CellStreamer, createHoles } from "@/lib/play/world/streaming";
import { insidePolygon, TerrainMap } from "@/lib/play/world/terrain";

const WALK = 1.4, RUN = 5.0;
const CART_SPEED = 3.6, CART_TURN = 0.9;
const INTERACT_RANGE = 3.0, RIDE_RANGE = 4.6, PLACE_RANGE = 12;
const ERA_SECONDS = 2.6, RESTORE_SECONDS = 3.4;
const GRAVITY = -16;
// The band above the ground a ride's footprint is tested in. Its base sits under the player's
// step height, so a ride cannot cross anything the player could not walk back over.
const RIDE_BASE = 0.4, RIDE_TOP = 1.85;
// The steepest ground a ride will take, as rise over run along its length.
const RIDE_MAX_SLOPE = 0.2;
// Higher than this above the ground, a person is on something built and the ground rules do not apply.
const ON_STRUCTURE = 1.4;
// How often the walkers are shared out among the routes nearest the player.
const ROUTE_SECONDS = 1.5;
// A walker this close to the player is not moved to another route, so nobody vanishes in view.
const ROUTE_KEEP = 45;
// No part of a ride comes within PERSON_CLEARANCE of a person's centre. Moves are tested against
// the larger gate at SWEEP_STEP spacing, so the footprint stays out between samples as well.
const PERSON_CLEARANCE = 0.5, SWEEP_STEP = 0.04;
const CLEARANCE_GATE = PERSON_CLEARANCE + SWEEP_STEP;
// How far off the gate a walker keeps while it walks round a ride.
const ROUND_OFFSET = 0.15;
// A figure's GLB records how fast its planted foot moves at clip speed 1 (scene extras, walk_speed).
// The clip plays at ground speed over that, inside the range of a believable step rate. A walker
// never goes faster than its top rate allows, so its feet do not skate.
const WALK_RATE_MIN = 0.7, WALK_RATE_MAX = 1.3;

// Skin that can sit under clothes is drawn slightly further from the camera (the _behind attribute),
// so a leg in stride never shows through a skirt, with no gap in the mesh.
const LAYER_METRES = 0.04;
function layeredFigure(material) {
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = shader.vertexShader
			.replace("#include <common>", "#include <common>\nattribute float _behind;")
			.replace(
				"#include <project_vertex>",
				`#include <project_vertex>
				{
					vec4 layered = projectionMatrix * vec4(mvPosition.xy, mvPosition.z - _behind * ${LAYER_METRES.toFixed(3)}, mvPosition.w);
					gl_Position.z = layered.z / layered.w * gl_Position.w;
				}`,
			);
	};
	material.customProgramCacheKey = () => "layered-figure";
	return material;
}

// Blender metres (x, y) to the web's (x, z).
export const toScene = (p, y = 0) => new THREE.Vector3(p[0], y, -p[1]);

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angleTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Signed distance from a point to a ride's footprint at a pose: negative inside it.
const footprintDistance = (px, pz, x, z, heading, halfX, halfZ) => {
	const ox = px - x, oz = pz - z;
	const c = Math.cos(heading), s = Math.sin(heading);
	const u = Math.abs(ox * c - oz * s) - halfX, v = Math.abs(ox * s + oz * c) - halfZ;
	return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
};

const rideDistance = (px, pz, r) => footprintDistance(px, pz, r.group.position.x, r.group.position.z, r.heading, r.halfX, r.halfZ);

// The way out of a ride's footprint from a point, as a world (x, z) unit vector.
const footprintNormal = (px, pz, r) => {
	const ox = px - r.group.position.x, oz = pz - r.group.position.z;
	const c = Math.cos(r.heading), s = Math.sin(r.heading);
	const lx = ox * c - oz * s, lz = ox * s + oz * c;
	const u = Math.abs(lx) - r.halfX, v = Math.abs(lz) - r.halfZ;
	let nx = 0, nz = 0;
	if (u > 0 || v > 0) {
		nx = Math.max(u, 0) * (Math.sign(lx) || 1);
		nz = Math.max(v, 0) * (Math.sign(lz) || 1);
	} else if (u > v) nx = Math.sign(lx) || 1;
	else nz = Math.sign(lz) || 1;
	const len = Math.hypot(nx, nz);
	return [(nx * c + nz * s) / len, (-nx * s + nz * c) / len];
};

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
		this.terrain = new TerrainMap();
		this.ringHoles = createHoles();
		this.baseHoles = createHoles();
		this.eraColliders = { then: new Set(), now: new Set() };
		this.streamer = new CellStreamer(this);
		this.routes = [];
		this.routeTimer = 0;
		this.riding = null;
		this.holds = new Set(); // named reasons the player is held still
		this.visited = new Set();
		this.pastEra = pastEraOf(missions);
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

	// A script, choice, era shift or restoration holds the player still. Each names its own hold,
	// so one ending never frees the player while another is still running.
	hold(reason, on) {
		if (on) this.holds.add(reason);
		else this.holds.delete(reason);
	}

	get blocked() {
		return this.holds.size > 0;
	}

	isPast(era) {
		return era === this.pastEra;
	}

	async load(renderer, onProgress = () => {}) {
		const ktx = new KTX2Loader().setTranscoderPath("/virtual/basis/").detectSupport(renderer);
		this.ktx = ktx;
		const gltf = new GLTFLoader().setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);
		this.gltf = gltf;
		const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
		const size = this.preset.atlas === "large" ? 1 : 0;

		this.anisotropy = anisotropy;
		this.atlasIndex = size;
		const start = this.streamer.cell(this.world.start_cell);
		const jobs = [];
		let done = 0;
		const groups = Object.entries(start.spec.groups).filter(([, g]) => !g.defer);
		const total = groups.length + 3;
		const step = () => onProgress(++done / total);
		for (const [name, g] of groups) jobs.push(this._loadGroup(start, name, g).then(step));
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

	_cellTexture(spec, name) {
		const sizes = spec.textures[name];
		const px = sizes[Math.min(this.atlasIndex, sizes.length - 1)];
		return this.ktx.loadAsync(this.url(`${spec.id}/tex/${name}_${px}.ktx2`)).then((t) => {
			t.colorSpace = THREE.SRGBColorSpace;
			t.anisotropy = this.anisotropy;
			t.flipY = false;
			return t;
		});
	}

	// One group of a cell: its mesh and baked textures. Its colliders are built later by the streamer.
	async _loadGroup(cell, name, g) {
		const spec = cell.spec;
		const [model, now, then] = await Promise.all([
			this.gltf.loadAsync(this.url(`${spec.id}/${name}.glb`)),
			this._cellTexture(spec, g.now),
			g.then ? this._cellTexture(spec, g.then) : null,
		]);
		const ground = name === "ground";
		const material = createBakedMaterial(this.uniforms, {
			now,
			then,
			mode: g.mode,
			classes: !!g.classes,
			doubleSide: true,
			detail: ground ? (this.detail ??= createDetailTexture()) : null,
			flatY: ground ? this.groundY + 0.02 : null,
			holes: g.ring ? this.ringHoles : null,
		});
		cell.pendingTris ??= [];
		model.scene.traverse((o) => {
			if (o.isMesh) {
				o.material = material;
				o.frustumCulled = !ground;
				if (g.collide) cell.pendingTris.push({ tris: this._collectTris(o, g.collide_min_area ?? 0.03), era: g.collide_era || "both" });
			}
		});
		this.root.add(model.scene);
		cell.parts.push(model.scene);
		cell.textures.push(now);
		if (then) cell.textures.push(then);
		cell.loaded.add(name);
	}

	// The coarse ground of the whole map, so nothing past the loaded cells is ever empty.
	async _loadBase() {
		const base = this.world.base;
		if (!base) return;
		const g = base.groups.ground;
		const [model, now, then] = await Promise.all([
			this.gltf.loadAsync(this.url(`${base.id}/ground.glb`)),
			this._cellTexture(base, g.now),
			this._cellTexture(base, g.then),
		]);
		const material = createBakedMaterial(this.uniforms, { now, then, mode: "both", doubleSide: true, flatY: this.groundY - 0.1, holes: this.baseHoles });
		model.scene.traverse((o) => {
			if (o.isMesh) {
				o.material = material;
				o.frustumCulled = false;
				o.renderOrder = -1;
			}
		});
		this.root.add(model.scene);
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
		return new Float32Array(out);
	}

	async _loadPlayer() {
		const g = await this.gltf.loadAsync(this.url(`actors/${this.world.actors.player}.glb`));
		this.strides = g.scene.userData.strides || null;
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
					o.material = layeredFigure(new THREE.MeshLambertMaterial({ map }));
					o.frustumCulled = false;
					o.castShadow = true;
				}
			});
			const mixer = new THREE.AnimationMixer(model);
			const actions = Object.fromEntries(g.animations.map((c) => [c.name, mixer.clipAction(c)]));
			const group = new THREE.Group();
			group.add(model, this._blob(0.5));
			this.root.add(group);
			return { group, mixer, actions, clip: null, stride: g.scene.userData.walk_speed || 0 };
		};
		for (const n of this.missions.npcs) {
			const a = make(n.figure);
			a.group.position.copy(toScene(n.at, this.groundY));
			a.group.rotation.y = THREE.MathUtils.degToRad(n.face_deg ?? 0);
			a.baseYaw = a.group.rotation.y;
			this._clip(a, "idle");
			a.era = n.era || this.pastEra;
			this.storyNpcs.set(n.id, { ...a, spec: n });
		}
		this.routes = (this.world.people || []).map((p) => ({
			spec: p,
			points: p.route.map((q) => toScene(q, q.length > 2 ? q[2] : this.groundY)),
			level: p.route[0].length > 2 ? p.route[0][2] : null,
			actor: null,
		}));
		this.routes.slice(0, this.preset.people).forEach((route, i) => {
			const a = make(route.spec.figure);
			a.figure = route.spec.figure;
			a.index = i;
			this._giveRoute(a, route, 0);
			this._clip(a, "idle");
			a.mixer.setTime(i * 0.37);
			this.people.push(a);
		});
	}

	_giveRoute(a, route, from) {
		if (a.routeRef) a.routeRef.actor = null;
		route.actor = a;
		a.routeRef = route;
		a.route = route.points;
		a.level = route.level;
		const at = Math.min(from, a.route.length - 1);
		a.group.position.copy(a.route[at]);
		const pace = route.spec.speed || 1.15 + (a.index % 3) * 0.08;
		Object.assign(a, { leg: at + 1 < a.route.length ? at + 1 : at - 1, dir: at + 1 < a.route.length ? 1 : -1, wait: 1 + (a.index % 4), side: 0, around: 0, stuck: 0, flips: 0, offRoute: false, speed: a.stride ? Math.min(pace, a.stride * WALK_RATE_MAX) : pace });
	}

	// The routes nearest the player get the walkers. A walker in view keeps its route.
	_shareRoutes() {
		const px = this.pos.x, pz = this.pos.z;
		const reach = (route) => Math.min(...route.points.map((q) => Math.hypot(q.x - px, q.z - pz)));
		const ranked = this.routes.map((route) => ({ route, d: reach(route) })).sort((p, q) => p.d - q.d);
		const wanted = new Set(ranked.slice(0, this.people.length).map((r) => r.route));
		const free = this.people.filter((a) => !wanted.has(a.routeRef) && Math.hypot(a.group.position.x - px, a.group.position.z - pz) > ROUTE_KEEP);
		for (const { route } of ranked.slice(0, this.people.length)) {
			if (route.actor) continue;
			const i = free.findIndex((a) => a.figure === route.spec.figure);
			if (i < 0) continue;
			const [a] = free.splice(i, 1);
			// Start at the end of the route furthest from the player.
			let far = 0, best = -1;
			route.points.forEach((q, k) => {
				const d = Math.hypot(q.x - px, q.z - pz);
				if (d > best) {
					best = d;
					far = k;
				}
			});
			this._giveRoute(a, route, far);
		}
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
			if (file.length) {
				const raw = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3());
				inner.scale.setScalar(file.length / Math.max(raw.x, raw.z));
			} else {
				inner.scale.setScalar(file.scale || 1);
			}
			inner.rotation.y = THREE.MathUtils.degToRad(file.yaw || 0);
			const box = new THREE.Box3().setFromObject(inner);
			inner.position.y -= box.min.y;
			const halfX = Math.max(-box.min.x, box.max.x), halfZ = Math.max(-box.min.z, box.max.z);
			const rocker = new THREE.Group();
			rocker.add(inner);
			const group = new THREE.Group();
			group.add(rocker, this._blob(2.2));
			group.position.copy(toScene(s.at, this.groundY));
			group.rotation.y = THREE.MathUtils.degToRad(s.face_deg ?? 0);
			this.root.add(group);
			this.rides.set(s.id, { spec: s, group, rocker, seat: file.seat || [0, 1.3, -0.6], heading: group.rotation.y, v: 0, phase: 0, halfX, halfZ });
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
			uniforms: { uTime: this.uniforms.uTime, uFade: { value: 1 } },
			vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
			fragmentShader: "uniform float uTime, uFade; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.8) * (0.42 + 0.08 * sin(uTime * 2.4)) * uFade; gl_FragColor = vec4(vec3(1.0, 0.56, 0.26) * a, a); }",
		});
		this.beacon = new THREE.Group();
		const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 22, 16, 1, true), beamMat);
		this.beamMat = beamMat;
		beam.position.y = 11;
		const ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1.05, 40), new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
		ring.rotation.x = -Math.PI / 2;
		ring.position.y = 0.06;
		this.beacon.add(beam, ring);
		this.beacon.visible = false;
		this.root.add(this.beacon);

		for (const r of this.missions.records || []) {
			// A plain marker, so it never reads as the object the record describes.
			const mat = new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false });
			const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mat);
			const g = new THREE.Group();
			g.add(m);
			m.position.y = 1.25;
			g.position.copy(toScene(r.at, this.groundY));
			g.visible = false;
			this.root.add(g);
			this.records.set(r.id, { spec: r, group: g, mesh: m });
		}
	}

	_buildToday() {
		const items = this.world.today?.blocks?.items;
		if (!items?.length) return;
		const mat = createBakedMaterial(this.uniforms, { now: this._flatTexture(), mode: "now" });
		const geo = new THREE.BoxGeometry(1, 1, 1);
		geo.setAttribute("_class", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
		geo.translate(0, 0.5, 0);
		const mesh = new THREE.InstancedMesh(geo, mat, items.length);
		const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
		const up = new THREE.Vector3(0, 1, 0);
		items.forEach(([x, y, w, d, h, yaw], i) => {
			p.set(x, this.groundY, -y);
			q.setFromAxisAngle(up, yaw);
			s.set(w, h, d);
			mesh.setMatrixAt(i, m.compose(p, q, s));
		});
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
				// Each view is framed on the tree's bounds, not its origin: center is that offset.
				for (const [t, yaw, offset] of [[front, 0, c.center?.[0] ?? 0], [side, Math.PI / 2, c.center?.[1] ?? 0]]) {
					t.colorSpace = THREE.SRGBColorSpace;
					t.anisotropy = anisotropy;
					const mat = createBakedMaterial(this.uniforms, { now: t, mode: "then", cutout: true });
					const geo = new THREE.PlaneGeometry(c.width, c.height);
					// KTX2 images start at the top left, plane UVs at the bottom left.
					const uv = geo.attributes.uv;
					for (let u = 0; u < uv.count; u++) uv.setY(u, 1 - uv.getY(u));
					geo.translate(offset, c.height / 2, 0);
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
		// Level ground: all of today, and the past until the start cell's real ground is in.
		this.basePlane = world.createCollider(R.ColliderDesc.cuboid((b[2] - b[0]) / 2 + 40, 0.5, (b[3] - b[1]) / 2 + 40).setTranslation(cx, this.groundY - 0.5, cz));
		for (const [x, y, w, d, h, yaw] of this.world.today?.blocks?.items || []) {
			const col = world.createCollider(
				R.ColliderDesc.cuboid(w / 2, h / 2, d / 2)
					.setTranslation(x, this.groundY + h / 2, -y)
					.setRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) }),
			);
			this.eraColliders.now.add(col);
		}
		// What loaded with the first view gets its colliders at once.
		const start = this.streamer.cell(this.world.start_cell);
		for (const { tris, era } of start.pendingTris || []) start.colliders.push(this._addTrimesh(tris, era));
		start.pendingTris = [];
		this._applyColliderEra();
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

	_addTrimesh(tris, era) {
		const indices = new Uint32Array(tris.length / 3);
		for (let i = 0; i < indices.length; i++) indices[i] = i;
		const col = this.phys.createCollider(this.R.ColliderDesc.trimesh(tris, indices));
		if (era === "then" || era === "now") {
			this.eraColliders[era].add(col);
			col.setEnabled(this._colliderEra() === era);
		}
		return col;
	}

	// A cell's ground. Rapier takes columns along x and rows along z, centred on the collider.
	_addHeightfield(t, heights) {
		const { nx, ny } = t;
		const data = new Float32Array(nx * ny);
		for (let c = 0; c < nx; c++) {
			// Rows run along scene z, which is minus Blender y.
			for (let r = 0; r < ny; r++) data[c * ny + r] = heights[(ny - 1 - r) * nx + c];
		}
		const sx = (nx - 1) * t.dx, sz = (ny - 1) * t.dy;
		const desc = this.R.ColliderDesc.heightfield(ny - 1, nx - 1, data, { x: sx, y: 1, z: sz }).setTranslation(t.x0 + sx / 2, 0, -(t.y0 + sz / 2));
		const col = this.phys.createCollider(desc);
		this.eraColliders.then.add(col);
		col.setEnabled(this._colliderEra() === "then");
		return col;
	}

	_removeCollider(col) {
		this.eraColliders.then.delete(col);
		this.eraColliders.now.delete(col);
		this.phys.removeCollider(col, false);
	}

	_colliderEra() {
		return this.era === undefined || this.isPast(this.era) ? "then" : "now";
	}

	_applyColliderEra() {
		const era = this._colliderEra();
		for (const col of this.eraColliders.then) col.setEnabled(era === "then");
		for (const col of this.eraColliders.now) col.setEnabled(era === "now");
		this.basePlane?.setEnabled(era === "now" || this.streamer.cell(this.world.start_cell).status !== "ready");
	}

	_onCellReady(c) {
		if (c.spec.id === this.world.start_cell) this._applyColliderEra();
	}

	// Ground height under a scene (x, z). Today the ground is level everywhere.
	groundAt(x, z) {
		if (this._colliderEra() === "now") return this.groundY;
		return this.terrain.sample(x, -z) ?? this.groundY;
	}

	// May a person stand here? Inside the map's edge, on a loaded cell, and not in the ditch or a tank.
	_canStand(x, z, onGround = true) {
		const y = -z;
		const b = this.streamer.open ? this.world.play_bounds : this.world.start_bounds || this.world.play_bounds;
		if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) return false;
		if (this.streamer.open && this.world.walk_limit && !insidePolygon(x, y, this.world.walk_limit)) return false;
		if (this._colliderEra() === "now") return true;
		if (this.streamer.open && !this.streamer.isReady(x, y)) return false;
		if (onGround) {
			const h = this.terrain.sample(x, y);
			if (h !== null && h < (this.world.min_walk_y ?? -Infinity)) return false;
		}
		return true;
	}

	teleport(p, faceDeg = null) {
		const v = toScene(p, 0);
		v.y = this.groundAt(v.x, v.z);
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
		const v = this.isPast(era) ? 1 : 0;
		this.uniforms.uFrom.value = v;
		this.uniforms.uTo.value = v;
		this.uniforms.uRadius.value = 0;
		this.eraMix = v;
		this.era = era;
		this._applyEraLook();
		this._applyColliderEra();
		this._settleAfterEra();
	}

	// The ground and walls change with the era. A player left inside one is moved to the nearest clear spot.
	_settleAfterEra() {
		if (!this.phys || !this.body || this.riding) return;
		const x = this.pos.x, z = this.pos.z;
		this._walkShape ??= new this.R.Capsule(0.39, 0.3);
		const clearAt = (px, py, pz) => !this.phys.intersectionWithShape({ x: px, y: py + 1.14, z: pz }, { x: 0, y: 0, z: 0, w: 1 }, this._walkShape, undefined, undefined, this.collider, this.body);
		const clear = (px, pz) => this._canStand(px, pz) && clearAt(px, this.groundAt(px, pz), pz);
		const y = this.groundAt(x, z);
		// Standing clear where they are, on the ground or on an upper floor: leave them there.
		if (this.pos.y >= y - 0.05 && clearAt(x, this.pos.y, z)) return;
		if (clear(x, z)) {
			this.teleport([x, -z]);
			return;
		}
		for (let r = 1; r <= 40; r += 1) {
			for (let k = 0; k < 16; k++) {
				const a = (k / 16) * Math.PI * 2;
				const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
				if (clear(px, pz)) {
					this.teleport([px, -pz]);
					return;
				}
			}
		}
	}

	shiftEra(to, onDone) {
		const u = this.uniforms;
		u.uFrom.value = this.isPast(this.era) ? 1 : 0;
		u.uTo.value = this.isPast(to) ? 1 : 0;
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
		const inPast = k > 0.5;
		for (const n of this.storyNpcs.values()) n.group.visible = this.isPast(n.era) === inPast;
		for (const p of this.people) p.group.visible = inPast;
		for (const r of this.rides.values()) r.group.visible = inPast;
	}

	setResolved(classes, instant = true) {
		const v = this.uniforms.uResolved.value;
		for (const c of classes) if (CLASS_IDS[c]) v[CLASS_IDS[c]] = 1;
		if (classes.length) v[0] = 1; // trim with no class of its own resolves with the building
		if (instant) this.uniforms.uResolveY.value = RESOLVED_Y;
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

	// Where a ride is now, as Blender [x, y]. A ride stays where the player left it.
	ridePosition(id) {
		const r = this.rides.get(id);
		return r ? [r.group.position.x, -r.group.position.z] : null;
	}

	markVisited(ids) {
		for (const id of ids || []) this.visited.add(id);
	}

	setObjective(obj, waypoint) {
		if (obj?.id !== this.objective?.id) this._arrived = false;
		this.objective = obj;
		this.waypoint = waypoint;
		this.beacon.visible = !!waypoint;
		if (waypoint) this.beacon.position.copy(toScene(waypoint, this.groundAt(waypoint[0], -waypoint[1])));
		for (const r of this.records.values()) r.group.visible = obj?.kind === "record" && obj.record === r.spec.id;
	}

	// ---------------------------------------------------------------- interaction

	_findPrompt() {
		// No live objective means a card or splash is up: nothing in the world can be used.
		const o = this.objective;
		if (this.blocked || !o) return null;
		if (this.riding) {
			return this.time < (this._noRoomUntil ?? 0)
				? { kind: "leave", id: "no-room", label: "No room to get down here" }
				: { kind: "leave", id: "leave", label: "Get down" };
		}
		if (o.kind === "era" || o.kind === "restore") return { kind: "action", id: o.id, label: o.text };
		if (!allowsRoaming(o)) return null;
		let best = null, bestD = Infinity;
		const consider = (kind, id, label, at, range) => {
			const d = Math.hypot(at.x - this.pos.x, at.z - this.pos.z);
			if (d < range && d < bestD) {
				best = { kind, id, label };
				bestD = d;
			}
		};
		// What the live objective asks for wins over anything else in reach.
		if (o?.kind === "record") {
			const r = this.records.get(o.record);
			if (r?.group.visible) consider("record", o.record, `Read ${r.spec.title.replace(/^The /, "the ")}`, r.group.position, INTERACT_RANGE);
		}
		if (o?.kind === "talk") {
			const n = this.storyNpcs.get(o.npc);
			if (n?.group.visible) consider("npc", o.npc, `Talk to ${n.spec.role.toLowerCase()}`, n.group.position, INTERACT_RANGE);
		}
		if (best) return best;
		for (const [id, n] of this.storyNpcs) if (n.group.visible) consider("npc", id, `Talk to ${n.spec.role.toLowerCase()}`, n.group.position, INTERACT_RANGE);
		for (const [id, r] of this.records) if (r.group.visible) consider("record", id, `Read ${r.spec.title.replace(/^The /, "the ")}`, r.group.position, INTERACT_RANGE);
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

	// Returns false, and stays on the ride, when there is nowhere clear to step down.
	dismount() {
		const r = this.rides.get(this.riding);
		if (!r) return false;
		const p = this._dismountSpot(r);
		if (!p) {
			this._noRoomUntil = this.time + 2.5;
			return false;
		}
		this._noRoomUntil = 0;
		this.riding = null;
		this.player.position.copy(p);
		this.teleport([p.x, -p.z]);
		this._play("idle");
		this.cb.onRide?.(null);
		return true;
	}

	// A spot beside, behind or ahead of the ride that a person can stand on and reach from its
	// centre with nothing in between, so stepping down can never cross a wall.
	_dismountSpot(r) {
		const sx = Math.cos(r.heading), sz = -Math.sin(r.heading);
		const fx = -Math.sin(r.heading), fz = -Math.cos(r.heading);
		const side = r.halfX + 1.2, end = r.halfZ + 0.9;
		const from = r.group.position;
		this._walkShape ??= new this.R.Capsule(0.39, 0.3);
		for (const [dx, dz] of [[sx * side, sz * side], [-sx * side, -sz * side], [-fx * end, -fz * end], [fx * end, fz * end]]) {
			const x = from.x + dx, z = from.z + dz;
			if (!this._canStand(x, z)) continue;
			const len = Math.hypot(dx, dz);
			const y = Math.max(from.y, this.groundAt(x, z)) + 1.14;
			const hit = this.phys.castShape({ x: from.x, y, z: from.z }, { x: 0, y: 0, z: 0, w: 1 }, { x: dx / len, y: 0, z: dz / len }, this._walkShape, 0.04, len, true, undefined, undefined, this.collider, this.body);
			if (!hit) return new THREE.Vector3(x, this.groundAt(x, z), z);
		}
		return null;
	}

	faceNpc(id, on) {
		const n = this.storyNpcs.get(id);
		if (!n) return;
		n.facingPlayer = on;
		this.talkingTo = on ? n : null;
		this._clip(n, on ? "talk" : "idle");
	}

	// In a conversation the camera turns to frame the person speaking over the player's shoulder.
	_stepTalkCamera(dt) {
		const n = this.talkingTo;
		if (!n) return;
		const dx = n.group.position.x - this.pos.x, dz = n.group.position.z - this.pos.z;
		const toNpc = Math.atan2(-dx, -dz);
		this.facing = toNpc;
		this.player.rotation.y += angleTo(this.player.rotation.y, toNpc + Math.PI) * Math.min(1, dt * 8);
		this.yaw += angleTo(this.yaw, toNpc + 0.3) * Math.min(1, dt * 3.5);
		this.pitch = damp(this.pitch, -0.08, 3, dt);
	}

	_rideBlocked(x, z) {
		const by = -z;
		if (!this._canStand(x, z)) return true;
		for (const q of this.world.no_ride || []) if (x > q[0] && x < q[2] && by > q[1] && by < q[3]) return true;
		return false;
	}

	// Too steep for a loaded cart, along its length, at this pose?
	_rideTooSteep(r, x, z, heading) {
		const fx = -Math.sin(heading) * r.halfZ, fz = -Math.cos(heading) * r.halfZ;
		const front = this.groundAt(x + fx, z + fz), back = this.groundAt(x - fx, z - fz);
		return Math.abs(front - back) / (2 * r.halfZ) > RIDE_MAX_SLOPE;
	}

	_rideQuery(r, heading) {
		r.shape ??= new this.R.Cuboid(r.halfX, (RIDE_TOP - RIDE_BASE) / 2, r.halfZ);
		return {
			shape: r.shape,
			pos: { x: r.group.position.x, y: r.group.position.y + (RIDE_BASE + RIDE_TOP) / 2, z: r.group.position.z },
			rot: { x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) },
		};
	}

	// Would the ride's footprint strike the world moving by (dx, dz)? A ride already touching
	// something may still back away from it.
	_rideHitsWorld(r, heading, dx, dz) {
		const len = Math.hypot(dx, dz);
		if (!this.phys || len < 1e-5) return false;
		const { shape, pos, rot } = this._rideQuery(r, heading);
		return !!this.phys.castShape(pos, rot, { x: dx / len, y: 0, z: dz / len }, shape, 0.04, len, false, undefined, undefined, this.collider, this.body);
	}

	_rideOverlaps(r, heading) {
		if (!this.phys) return false;
		const { shape, pos, rot } = this._rideQuery(r, heading);
		return !!this.phys.intersectionWithShape(pos, rot, shape, undefined, undefined, this.collider, this.body);
	}

	// Can the ride go from where it is to this pose with its whole footprint, corners included,
	// staying out of everyone's clearance? Someone already inside it may only be moved away from.
	_rideClearOfPeople(r, x, z, heading) {
		const fromX = r.group.position.x, fromZ = r.group.position.z;
		const turn = angleTo(r.heading, heading);
		const reach = Math.hypot(r.halfX, r.halfZ);
		const travel = Math.hypot(x - fromX, z - fromZ) + Math.abs(turn) * reach;
		const samples = Math.max(1, Math.ceil(travel / SWEEP_STEP));
		for (const a of [...this.people, ...this.storyNpcs.values()]) {
			if (!a.group.visible) continue;
			const px = a.group.position.x, pz = a.group.position.z;
			if (Math.hypot(px - fromX, pz - fromZ) > reach + CLEARANCE_GATE + travel) continue;
			const limit = Math.min(CLEARANCE_GATE, footprintDistance(px, pz, fromX, fromZ, r.heading, r.halfX, r.halfZ));
			for (let i = 1; i <= samples; i++) {
				const t = i / samples;
				if (footprintDistance(px, pz, fromX + (x - fromX) * t, fromZ + (z - fromZ) * t, r.heading + turn * t, r.halfX, r.halfZ) < limit) return false;
			}
		}
		return true;
	}

	// The same promise from the walker's side: this step keeps out of every ride's clearance.
	_walkerClear(x, z, dx, dz) {
		const samples = Math.max(1, Math.ceil(Math.hypot(dx, dz) / SWEEP_STEP));
		for (const r of this.rides.values()) {
			if (!r.group.visible) continue;
			const limit = Math.min(CLEARANCE_GATE, rideDistance(x, z, r));
			for (let i = 1; i <= samples; i++) {
				if (rideDistance(x + (dx * i) / samples, z + (dz * i) / samples, r) < limit) return false;
			}
		}
		return true;
	}

	// Authored routes are clear of walls. A walker pushed off its route has to check for itself.
	_walkerHitsWorld(x, z, dx, dz) {
		if (!this._canStand(x + dx, z + dz)) return true;
		const len = Math.hypot(dx, dz);
		if (!this.phys || len < 1e-5) return false;
		this._walkShape ??= new this.R.Capsule(0.39, 0.3);
		return !!this.phys.castShape({ x, y: this.groundAt(x, z) + 1.14, z }, { x: 0, y: 0, z: 0, w: 1 }, { x: dx / len, y: 0, z: dz / len }, this._walkShape, 0.04, len, false, undefined, undefined, this.collider, this.body);
	}

	_closestRide(x, z) {
		let best = null, bestD = Infinity;
		for (const r of this.rides.values()) {
			if (!r.group.visible) continue;
			const d = rideDistance(x, z, r);
			if (d < bestD) {
				best = r;
				bestD = d;
			}
		}
		return best ? { ride: best, dist: bestD } : null;
	}

	// ---------------------------------------------------------------- the frame

	tick(rawDt, camera, input) {
		if (!this.ready || !this.kcc) return;
		const dt = Math.min(rawDt, 0.05);
		this.time += dt;
		this.uniforms.uTime.value = this.time;
		this.streamer.tick(dt);
		this.routeTimer -= dt;
		if (this.routeTimer <= 0) {
			this.routeTimer = ROUTE_SECONDS;
			this._shareRoutes();
		}
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
		if (input.consume("interact")) {
			if (prompt?.kind === "ride") this.mountRide(prompt.id);
			else if (prompt?.kind === "leave") this.dismount();
			else this.cb.onInteract?.(prompt); // null: the press may still dismiss a splash
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
		this._stepTalkCamera(dt);
		this.mixer.update(dt);
		this._stepAnims(dt);
		this._stepCamera(dt, camera);
		this._checkArrival();
		this._checkPlaces();
		if (this.shadowPlane) {
			this.shadowPlane.position.set(this.pos.x, this.groundAt(this.pos.x, this.pos.z) + 0.03, this.pos.z);
			this.sun.target.position.copy(this.pos);
			this.sun.position.copy(this.pos).addScaledVector(this.sunDir, 60);
		}
		if (this.beacon.visible) {
			this.beacon.rotation.y += dt * 0.4;
			const d = Math.hypot(this.beacon.position.x - this.pos.x, this.beacon.position.z - this.pos.z);
			this.beamMat.uniforms.uFade.value = THREE.MathUtils.smoothstep(d, 3, 14);
		}
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
		let nx = t.x + m.x, nz = t.z + m.z;
		// The map's edge, an unloaded cell and the ditch all stop a step, and the player slides along them.
		const onGround = t.y - 0.93 - this.groundAt(t.x, t.z) < ON_STRUCTURE;
		if (!this._canStand(nx, nz, onGround)) {
			if (this._canStand(nx, t.z, onGround)) nz = t.z;
			else if (this._canStand(t.x, nz, onGround)) nx = t.x;
			else {
				nx = t.x;
				nz = t.z;
			}
		}
		const ny = Math.max(t.y + m.y, this.groundAt(nx, nz) + 0.93);
		this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
		this.pos.set(nx, ny - 0.93, nz);
		this.player.position.copy(this.pos);
		this.player.rotation.y += angleTo(this.player.rotation.y, this.facing + Math.PI) * Math.min(1, dt * 12);
		this._play(this.speed < 0.25 ? "idle" : this.speed < 3.2 ? "walk" : "run");
		// Clip rate follows ground speed over the measured stride, so the planted foot does not skate.
		const strides = this.strides || {};
		if (this.actions.run && this.current === "run") this.actions.run.timeScale = THREE.MathUtils.clamp(this.speed / (strides.run || RUN), 0.6, 1.3);
		if (this.actions.walk && this.current === "walk") this.actions.walk.timeScale = THREE.MathUtils.clamp(this.speed / (strides.walk || WALK), 0.6, 1.3);
	}

	_stepRide(dt, input) {
		const r = this.rides.get(this.riding);
		const { moveX, moveY } = input.state;
		const want = this.blocked ? 0 : Math.max(-0.3, moveY) * CART_SPEED;
		r.v = damp(r.v, want, 1.8, dt);
		const turn = this.blocked ? 0 : -moveX * CART_TURN * Math.min(1, Math.abs(r.v) / 1.2) * Math.sign(r.v || 1);
		// It cannot swing its body into a wall or a person.
		const turned = r.heading + turn * dt;
		if (turn && !this._rideOverlaps(r, turned) && this._rideClearOfPeople(r, r.group.position.x, r.group.position.z, turned)) r.heading = turned;
		const fx = -Math.sin(r.heading), fz = -Math.cos(r.heading);
		const dir = Math.sign(r.v || 1);
		const stepX = fx * r.v * dt, stepZ = fz * r.v * dt;
		const nx = r.group.position.x + stepX, nz = r.group.position.z + stepZ;
		// A ride stops for anyone in front of it, never brings any part of itself into a person's
		// clearance, and never enters a wall, the palace or its platform.
		let clear = !this._rideBlocked(nx + fx * r.halfZ * dir, nz + fz * r.halfZ * dir) && !this._rideBlocked(nx - fx * r.halfZ * dir, nz - fz * r.halfZ * dir) && !this._rideTooSteep(r, nx, nz, r.heading) && !this._rideHitsWorld(r, r.heading, stepX, stepZ) && this._rideClearOfPeople(r, nx, nz, r.heading);
		for (const a of [...this.people, ...this.storyNpcs.values()]) {
			if (!a.group.visible) continue;
			const ox = a.group.position.x - r.group.position.x, oz = a.group.position.z - r.group.position.z;
			const ahead = (ox * fx + oz * fz) * dir;
			if (ahead > 0 && ahead < r.halfZ + 1.6 && Math.abs(ox * fz - oz * fx) < r.halfX + 0.5) clear = false;
		}
		if (clear) {
			r.group.position.x = nx;
			r.group.position.z = nz;
		} else {
			r.v = 0;
		}
		r.group.position.y = damp(r.group.position.y, this.groundAt(r.group.position.x, r.group.position.z), 9, dt);
		r.group.rotation.y = r.heading;
		r.phase += Math.abs(r.v) * dt * 3.4;
		r.rocker.rotation.z = Math.sin(r.phase) * 0.018 * Math.min(1, Math.abs(r.v));
		r.rocker.rotation.x = Math.sin(r.phase * 0.5) * 0.012 * Math.min(1, Math.abs(r.v));
		r.rocker.position.y = Math.abs(Math.sin(r.phase)) * 0.025;
		this._v.set(...r.seat).applyAxisAngle(THREE.Object3D.DEFAULT_UP, r.heading).add(r.group.position);
		this.pos.copy(r.group.position);
		this.player.position.copy(this._v);
		this.player.rotation.y = r.heading + Math.PI;
		this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + 3, z: this.pos.z });
		this.yaw += angleTo(this.yaw, r.heading) * Math.min(1, dt * (Math.abs(r.v) > 0.3 ? 1.6 : 0));
	}

	_stepPeople(dt) {
		const past = this.eraMix >= 0.5;
		for (const a of this.people) {
			// Nobody walks on ground that is not there yet.
			a.group.visible = past && !!a.routeRef && (!this.streamer.open || this.streamer.isReady(a.group.position.x, -a.group.position.z));
			if (!a.group.visible) continue;
			a.group.position.y = a.level ?? this.groundAt(a.group.position.x, a.group.position.z);
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
			// A parked ride can sit on a waypoint: from close by, that waypoint counts as reached.
			const covered = d < 2.5 && this._closestRide(target.x, target.z)?.dist < CLEARANCE_GATE + 0.3;
			if (d < 0.3 || covered) {
				this._nextLeg(a);
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
			const fromX = a.group.position.x, fromZ = a.group.position.z;
			if (this._walkerMove(a, vx, vz, dt)) {
				const faceX = a.group.position.x - fromX, faceZ = a.group.position.z - fromZ;
				a.group.rotation.y += angleTo(a.group.rotation.y, Math.atan2(faceX, faceZ)) * Math.min(1, dt * 6);
				this._clip(a, "walk");
				if (a.stride && a.actions.walk) a.actions.walk.timeScale = THREE.MathUtils.clamp(Math.hypot(vx, vz) / a.stride, WALK_RATE_MIN, WALK_RATE_MAX);
			} else {
				this._clip(a, "idle");
			}
		}
	}

	_nextLeg(a) {
		if (a.leg + a.dir >= a.route.length || a.leg + a.dir < 0) a.dir *= -1;
		a.leg += a.dir;
		a.wait = 1.5 + Math.random() * 3;
		a.around = 0;
		a.stuck = 0;
		a.flips = 0;
		a.offRoute = false;
	}

	_turnBack(a) {
		a.dir *= -1;
		this._nextLeg(a);
		a.offRoute = true; // it may be standing beside the route, not on it
	}

	// Walks straight on until a ride's clearance is in the way, then follows its edge round the
	// ride. With no way round either side it turns back. Returns whether the walker moved.
	_walkerMove(a, vx, vz, dt) {
		const p = a.group.position;
		const near = this._closestRide(p.x, p.z);
		const normal = near && near.dist < CLEARANCE_GATE + ROUND_OFFSET * 2 ? footprintNormal(p.x, p.z, near.ride) : null;
		// Once rounding a ride, carry on until the way ahead leads away from it.
		const rounding = a.around && normal && vx * normal[0] + vz * normal[1] < 0;
		if (!rounding) {
			const dx = vx * dt, dz = vz * dt;
			if (this._walkerClear(p.x, p.z, dx, dz) && !(a.offRoute && this._walkerHitsWorld(p.x, p.z, dx, dz))) {
				p.x += dx;
				p.z += dz;
				a.around = 0;
				a.stuck = 0;
				return true;
			}
		}
		if (normal) {
			const [nx, nz] = normal;
			const tx = -nz, tz = nx;
			const first = a.around || (tx * vx + tz * vz >= 0 ? 1 : -1);
			const stride = Math.hypot(vx, vz) * dt;
			const out = near.dist < CLEARANCE_GATE + ROUND_OFFSET ? 0.25 : 0;
			for (const side of [first, -first]) {
				const dx = (tx * side + nx * out) * stride, dz = (tz * side + nz * out) * stride;
				if (this._walkerClear(p.x, p.z, dx, dz) && !this._walkerHitsWorld(p.x, p.z, dx, dz)) {
					// Walled in on one side and now on the other: there is no way past.
					if (side !== first && (a.flips = (a.flips || 0) + 1) >= 2) {
						this._turnBack(a);
						return false;
					}
					p.x += dx;
					p.z += dz;
					a.around = side;
					a.offRoute = true;
					a.stuck = 0;
					return true;
				}
			}
		}
		a.stuck = (a.stuck || 0) + dt;
		if (a.stuck > 1.5) this._turnBack(a);
		return false;
	}

	_stepAnims(dt) {
		const e = this.eraAnim;
		if (e) {
			e.t += dt / ERA_SECONDS;
			const k = Math.min(1, e.t);
			const eased = k < 0.12 ? 0 : Math.pow((k - 0.12) / 0.88, 2.1);
			this.uniforms.uRadius.value = eased * e.reach;
			this.eraMix = THREE.MathUtils.lerp(e.from, this.isPast(e.to) ? 1 : 0, THREE.MathUtils.smoothstep(k, 0.2, 0.8));
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
			this.uniforms.uResolveY.value = THREE.MathUtils.lerp(this.groundY - 1.4, this.world.resolve_top ?? this.groundY + 11, k * k * (3 - 2 * k));
			if (k >= 1) {
				this.restoreAnim = null;
				this.uniforms.uResolveY.value = RESOLVED_Y;
				r.onDone?.();
			}
		}
	}

	_stepCamera(dt, camera) {
		const riding = !!this.riding;
		const portrait = camera.aspect < 1;
		// Up on a wall the camera comes closer and a little higher, so it stays on the walk and sees over the parapet.
		const up = !riding && this.pos.y - this.groundAt(this.pos.x, this.pos.z) > ON_STRUCTURE ? 1 : 0;
		this.camUp = damp(this.camUp ?? 0, up, 3.5, dt);
		const dist = (riding ? (portrait ? 9.2 : 7.6) : portrait ? this.camDist + 1.1 : this.camDist) - this.camUp * 1.3;
		const head = this._v.set(this.pos.x, this.pos.y + (riding ? 2.7 : 1.55) + this.camUp * 0.85, this.pos.z);
		const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
		const back = this._w.set(Math.sin(this.yaw) * cp, -sp, Math.cos(this.yaw) * cp);
		// The shoulder offset comes in against a wall, so the camera never starts on its far side.
		let right = riding ? 0 : portrait ? 0.08 : 0.42;
		if (this.phys && right > 0) {
			const out = new this.R.Ray({ x: head.x, y: head.y, z: head.z }, { x: Math.cos(this.yaw), y: 0, z: -Math.sin(this.yaw) });
			const wall = this.phys.castRay(out, right + 0.18, true, undefined, undefined, this.collider, this.body);
			if (wall) right = Math.max(0, wall.timeOfImpact - 0.18);
		}
		this.camSide = this.camSide == null || right < this.camSide ? right : damp(this.camSide, right, 6, dt);
		const shoulder = new THREE.Vector3(head.x + Math.cos(this.yaw) * this.camSide, head.y, head.z - Math.sin(this.yaw) * this.camSide);
		let reach = dist;
		if (this.phys && !riding) {
			const ray = new this.R.Ray({ x: shoulder.x, y: shoulder.y, z: shoulder.z }, { x: back.x, y: back.y, z: back.z });
			const hit = this.phys.castRay(ray, dist, true, undefined, undefined, this.collider, this.body);
			if (hit) reach = Math.max(0.75, hit.timeOfImpact - 0.22);
		}
		this.camReach = this.camReach == null ? reach : reach < this.camReach ? reach : damp(this.camReach, reach, 5, dt);
		camera.position.copy(shoulder).addScaledVector(back, this.camReach);
		camera.position.y = Math.max(camera.position.y, this.groundAt(camera.position.x, camera.position.z) + 0.25);
		camera.lookAt(shoulder.x - back.x * 6, shoulder.y - back.y * 6, shoulder.z - back.z * 6);
		const fov = (riding ? 62 : THREE.MathUtils.lerp(58, 66, Math.min(1, this.speed / RUN))) + (portrait ? 10 : 0);
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

	// First time the player comes near a named place.
	_checkPlaces() {
		if (!this.objective) return;
		for (const place of this.missions.places || []) {
			if (this.visited.has(place.id)) continue;
			const range = place.radius || PLACE_RANGE;
			if (Math.hypot(place.at[0] - this.pos.x, -place.at[1] - this.pos.z) > range) continue;
			this.visited.add(place.id);
			this.cb.onPlace?.(place);
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
