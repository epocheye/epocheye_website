// Simple dressing for an era, built from boxes in code so there is no model to license or load.
// Which pieces stand where comes from eras.stages.<era>.dress in missions.json.

import { BoxGeometry, BufferAttribute, Color, Group, Matrix4, Mesh, MeshLambertMaterial, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const WOOD = "#5d3e28", DARK = "#3c281b", PAPER = "#e4d8bc", RED = "#6d302a", GREEN = "#32504c", BROWN = "#7a5a36";
const LEDGERS = [RED, GREEN, BROWN];

// Each shape lists its boxes as [width, height, depth, x, y, z, colour, turn] with y at the box's
// base, and the footprint a person cannot walk through.
const stack = (x, y, z, n, w, d) => {
	const out = [];
	for (let i = 0; i < n; i++) out.push([w, 0.055, d, x + (i % 2 ? 0.015 : -0.01), y + i * 0.056, z, LEDGERS[i % 3], (i % 3) * 0.07 - 0.07]);
	return out;
};
const papers = (x, y, z, n) => {
	const out = [];
	for (let i = 0; i < n; i++) out.push([0.3, 0.012, 0.22, x + i * 0.012, y + i * 0.013, z - i * 0.008, PAPER, i * 0.09 - 0.1]);
	return out;
};

const SHAPES = {
	desk: {
		half: [0.85, 0.42],
		height: 0.8,
		boxes: () => [
			[1.7, 0.05, 0.84, 0, 0.74, 0, WOOD, 0],
			...[[-0.78, -0.36], [0.78, -0.36], [-0.78, 0.36], [0.78, 0.36]].map(([x, z]) => [0.07, 0.74, 0.07, x, 0, z, DARK, 0]),
			...stack(-0.45, 0.79, 0.04, 4, 0.32, 0.24),
			...papers(0.25, 0.79, 0.02, 5),
		],
	},
	shelf: {
		half: [0.95, 0.24],
		height: 1.9,
		boxes: () => {
			const out = [[0.05, 1.9, 0.44, -0.92, 0, 0, DARK, 0], [0.05, 1.9, 0.44, 0.92, 0, 0, DARK, 0]];
			for (const y of [0.08, 0.68, 1.28, 1.86]) out.push([1.88, 0.04, 0.44, 0, y, 0, WOOD, 0]);
			for (const y of [0.12, 0.72, 1.32]) {
				for (let i = 0; i < 9; i++) out.push([0.13, 0.4 + (i % 3) * 0.04, 0.3, -0.76 + i * 0.19, y, 0, LEDGERS[i % 3], 0]);
			}
			return out;
		},
	},
	chest: {
		half: [0.55, 0.36],
		height: 0.62,
		boxes: () => [
			[1.1, 0.5, 0.72, 0, 0, 0, WOOD, 0],
			[1.12, 0.1, 0.74, 0, 0.5, 0, DARK, 0],
			...stack(0.1, 0.6, 0, 3, 0.34, 0.26),
		],
	},
};

const up = new Vector3(0, 1, 0);

// items: [{ type, at: [x, y], face_deg }] in Blender metres. Returns the group, hidden, and the
// solid footprints for the physics to block.
export function buildDress(items, groundY) {
	const parts = [], blocks = [];
	const m = new Matrix4(), q = new Quaternion(), p = new Vector3(), s = new Vector3(1, 1, 1), c = new Color();
	for (const item of items) {
		const shape = SHAPES[item.type];
		if (!shape) continue;
		const yaw = ((item.face_deg ?? 0) * Math.PI) / 180;
		const x = item.at[0], z = -item.at[1];
		for (const [w, h, d, bx, by, bz, colour, turn] of shape.boxes()) {
			const g = new BoxGeometry(w, h, d);
			g.translate(0, h / 2, 0);
			g.applyMatrix4(m.compose(p.set(bx, by, bz), q.setFromAxisAngle(up, turn), s));
			g.applyMatrix4(m.compose(p.set(x, groundY, z), q.setFromAxisAngle(up, yaw), s));
			c.set(colour);
			const rgb = new Float32Array(g.attributes.position.count * 3);
			for (let i = 0; i < rgb.length; i += 3) rgb.set([c.r, c.g, c.b], i);
			g.setAttribute("color", new BufferAttribute(rgb, 3));
			g.deleteAttribute("uv");
			parts.push(g);
		}
		blocks.push({ x, z, yaw, halfX: shape.half[0], halfZ: shape.half[1], height: shape.height });
	}
	const group = new Group();
	group.visible = false;
	if (parts.length) {
		const merged = mergeGeometries(parts);
		for (const g of parts) g.dispose();
		const mesh = new Mesh(merged, new MeshLambertMaterial({ vertexColors: true }));
		mesh.castShadow = true;
		group.add(mesh);
	}
	return { group, blocks };
}
