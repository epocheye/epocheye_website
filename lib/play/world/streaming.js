// Streams a world's cells around the player: visuals, heights and colliders in, far cells out.
// Colliders are built a piece per frame, and a cell only counts as ready when all of them exist,
// so the player can never stand on ground that has no collider yet.

import { BufferAttribute, BufferGeometry, Mesh, Vector3, Vector4 } from "three";
import { decodeHeights } from "@/lib/play/world/terrain";

const START_DELAY = 2;
const PLAN_SECONDS = 0.4;
const RETRY_SECONDS = 5;
const UNLOAD_MARGIN = 70; // metres past the load radius, so a cell does not flicker at its edge
const CHUNK_METRES = 40; // a cell's trimesh is split on this grid, so no single build is long
const BASE_OVERLAP = 3; // metres of base ground kept under the edge of a loaded cell, wide enough to cover a pixel far away
const SKIRT_METRES = 0.6; // how far a cell's ground hangs down at its edge
export const MAX_HOLES = 16;

const rectDistance = (b, x, y) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));

export function createHoles() {
	return {
		uHoles: { value: Array.from({ length: MAX_HOLES }, () => new Vector4()) },
		uHoleCount: { value: 0 },
	};
}

// Each cell's mesh is quantised on its own grid, so two cells' edges differ by millimetres and leave
// pin holes along the seam. A short wall hung from a ground mesh's open edges closes them from any
// angle, in the same material, so it takes the ground's colour and its flattening today.
export function groundSkirt(mesh) {
	mesh.updateWorldMatrix(true, false);
	const { position: pos, uv } = mesh.geometry.attributes;
	const index = mesh.geometry.index;
	const count = index ? index.count : pos.count;
	const at = (i) => (index ? index.getX(i) : i);
	// An edge used by one triangle only is on the mesh's border. The value keeps its direction.
	const edges = new Map();
	for (let i = 0; i < count; i += 3) {
		for (let k = 0; k < 3; k++) {
			const a = at(i + k), b = at(i + ((k + 1) % 3));
			const key = a < b ? a * pos.count + b : b * pos.count + a;
			if (edges.has(key)) edges.set(key, null);
			else edges.set(key, [a, b]);
		}
	}
	const open = [...edges.values()].filter(Boolean);
	const slot = new Map();
	const positions = [], uvs = [], indices = [];
	const v = new Vector3();
	const vertex = (i) => {
		if (slot.has(i)) return slot.get(i);
		const n = positions.length / 3;
		v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
		positions.push(v.x, v.y, v.z, v.x, v.y - SKIRT_METRES, v.z);
		uvs.push(uv.getX(i), uv.getY(i), uv.getX(i), uv.getY(i));
		slot.set(i, n);
		return n;
	};
	for (const [a, b] of open) {
		const p = vertex(a), q = vertex(b);
		indices.push(p, p + 1, q + 1, p, q + 1, q);
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setAttribute("_class", new BufferAttribute(new Float32Array(positions.length / 3), 1));
	geometry.setIndex(indices);
	const skirt = new Mesh(geometry, mesh.material);
	skirt.name = "ground-skirt";
	skirt.frustumCulled = false;
	return skirt;
}

// Splits triangles (9 floats each) into pieces by where their first corner falls.
function splitTriangles(tris) {
	const buckets = new Map();
	for (let i = 0; i < tris.length; i += 9) {
		const key = `${Math.floor(tris[i] / CHUNK_METRES)}:${Math.floor(tris[i + 2] / CHUNK_METRES)}`;
		let b = buckets.get(key);
		if (!b) buckets.set(key, (b = []));
		b.push(i);
	}
	return [...buckets.values()].map((list) => {
		const out = new Float32Array(list.length * 9);
		list.forEach((at, n) => out.set(tris.subarray(at, at + 9), n * 9));
		return out;
	});
}

export class CellStreamer {
	constructor(rt) {
		this.rt = rt;
		this.radius = rt.preset.stream;
		this.parallel = rt.preset.id === "low" ? 1 : 2;
		this.cells = new Map(
			Object.values(rt.world.cells).map((spec) => [spec.id, { spec, status: "idle", token: 0, loaded: new Set(), parts: [], textures: [], colliders: [], jobs: 0, failedAt: -Infinity }]),
		);
		this.jobs = [];
		this.loading = 0;
		this.timer = 0;
		this.baseReady = false;
		this.stats = { loads: 0, unloads: 0, longestBuildMs: 0 };
	}

	cell(id) {
		return this.cells.get(id);
	}

	isReady(x, y) {
		for (const c of this.cells.values()) {
			const b = c.spec.bounds;
			if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && c.status === "ready") return true;
		}
		return false;
	}

	// Every cell the player may step into is ready: the start cell and the coarse base are both in.
	get open() {
		return this.baseReady && this.cells.get(this.rt.world.start_cell)?.status === "ready";
	}

	tick(dt) {
		this.timer -= dt;
		if (this.timer <= 0) {
			this.timer = PLAN_SECONDS;
			this._plan();
		}
		// One piece a frame keeps a new cell from costing one long frame.
		const job = this.jobs.shift();
		if (job) {
			const t0 = performance.now();
			job();
			this.stats.longestBuildMs = Math.max(this.stats.longestBuildMs, performance.now() - t0);
		}
	}

	_plan() {
		const { rt } = this;
		// The first view gets the network to itself. Everything else starts just after it.
		if (rt.time < START_DELAY) return;
		if (!this.baseStarted) {
			this.baseStarted = true;
			rt._loadBase().then(
				() => (this.baseReady = true),
				() => (this.baseStarted = false),
			);
		}
		const x = rt.pos.x, y = -rt.pos.z;
		const ranked = [...this.cells.values()].sort((p, q) => rectDistance(p.spec.bounds, x, y) - rectDistance(q.spec.bounds, x, y));
		for (const c of ranked) {
			const d = rectDistance(c.spec.bounds, x, y);
			const want = c.spec.keep || d <= this.radius;
			if (want && c.status !== "ready" && c.status !== "loading" && c.status !== "building" && this.loading < this.parallel && rt.time - c.failedAt > RETRY_SECONDS) {
				this._load(c);
			} else if (!c.spec.keep && d > this.radius + UNLOAD_MARGIN && c.status === "ready") {
				this._unload(c);
			}
		}
	}

	async _load(c) {
		const { rt } = this;
		const token = ++c.token;
		c.status = "loading";
		this.loading++;
		try {
			const wanted = Object.entries(c.spec.groups).filter(([name]) => !c.loaded.has(name));
			const [heightBytes] = await Promise.all([
				fetch(rt.url(c.spec.terrain.file)).then((r) => {
					if (!r.ok) throw new Error(`${c.spec.terrain.file} ${r.status}`);
					return r.arrayBuffer();
				}),
				...wanted.map(([name, g]) => rt._loadGroup(c, name, g)),
			]);
			if (token !== c.token) return;
			const t = c.spec.terrain;
			const heights = decodeHeights(new Uint8Array(heightBytes), t.nx * t.ny);
			c.status = "building";
			this._queueColliders(c, heights, token);
			this.stats.loads++;
		} catch {
			// The cell stays closed and is tried again. The player is simply held at its edge.
			if (token === c.token) {
				c.status = "idle";
				c.failedAt = rt.time;
			}
		} finally {
			this.loading--;
		}
	}

	// Attaches what was loaded before physics existed, or queues a cell's colliders.
	_queueColliders(c, heights, token) {
		const { rt } = this;
		const t = c.spec.terrain;
		const pieces = (c.pendingTris || []).flatMap(({ tris, era }) => splitTriangles(tris).map((part) => ({ part, era })));
		c.pendingTris = [];
		c.jobs = pieces.length + 1;
		const done = () => {
			if (token !== c.token) return;
			if (--c.jobs === 0) this._finish(c);
		};
		this.jobs.push(() => {
			if (token === c.token) {
				rt.terrain.add(c.spec.id, t, heights);
				c.colliders.push(rt._addHeightfield(t, heights));
			}
			done();
		});
		for (const { part, era } of pieces) {
			this.jobs.push(() => {
				if (token === c.token) c.colliders.push(rt._addTrimesh(part, era));
				done();
			});
		}
	}

	_finish(c) {
		c.status = "ready";
		this._updateHoles();
		this.rt._onCellReady?.(c);
	}

	_unload(c) {
		const { rt } = this;
		c.token++;
		c.status = "idle";
		c.loaded.clear();
		c.pendingTris = [];
		rt.terrain.remove(c.spec.id);
		for (const col of c.colliders) rt._removeCollider(col);
		c.colliders = [];
		for (const o of c.parts) {
			rt.root.remove(o);
			o.traverse((m) => {
				if (m.isMesh) {
					m.geometry.dispose();
					m.material.dispose();
				}
			});
		}
		c.parts = [];
		for (const tex of c.textures) tex.dispose();
		c.textures = [];
		this.stats.unloads++;
		this._updateHoles();
	}

	// Coarse layers are cut away wherever the full detail of a cell is standing.
	_updateHoles() {
		const fill = (holes, list) => {
			list.slice(0, MAX_HOLES).forEach((b, i) => holes.uHoles.value[i].set(b[0], b[1], b[2], b[3]));
			holes.uHoleCount.value = Math.min(list.length, MAX_HOLES);
		};
		const ready = [...this.cells.values()].filter((c) => c.status === "ready").map((c) => c.spec.bounds);
		fill(this.rt.ringHoles, ready);
		// The base ground stays on under a cell's edge, so nothing shows while a neighbour is still loading.
		fill(this.rt.baseHoles, ready.map((b) => [b[0] + BASE_OVERLAP, b[1] + BASE_OVERLAP, b[2] - BASE_OVERLAP, b[3] - BASE_OVERLAP]));
	}
}
