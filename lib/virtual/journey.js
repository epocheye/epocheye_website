// The scroll journey through the palace model (public/virtual/palace.glb).
//
// Standing points come from the reconstruction's authored viewpoints
// (heritage_assets/.../output/palace_viewpoints.json, ids P0..P10). They are in the building's
// plan frame: +X along the facade toward the NNE end, +Y into the building, +Z up, metres, origin
// at the centre of the main (ESE) facade at plinth-floor level. Headings are true bearings; the
// building's +Y axis points to 286.8 degrees. The GLB was exported from Blender (Z up) to glTF
// (Y up), so plan (x, y, z) is world (x, z, -y).

const AXIS_Y_BEARING = 286.8;
const EYE = 1.6;
const LOOK_DISTANCE = 8;

export function planToWorld([x, y, z]) {
	return [x, z, -y];
}

function viewDirection(headingDeg, pitchDeg) {
	const d = ((headingDeg - AXIS_Y_BEARING) * Math.PI) / 180;
	const p = (pitchDeg * Math.PI) / 180;
	return [Math.sin(d) * Math.cos(p), Math.sin(p), -Math.cos(d) * Math.cos(p)];
}

// A standing point at eye height, looking along a heading.
function stand(id, [x, y, floorZ], heading, pitch = 0) {
	const position = planToWorld([x, y, floorZ + EYE]);
	const dir = viewDirection(heading, pitch);
	const target = position.map((v, i) => v + dir[i] * LOOK_DISTANCE);
	return { id, position, target };
}

// A slow aerial orbit around the palace, for the opening and the closing shots.
function orbit(id, { radius, height, speed, phase }) {
	const centre = planToWorld([0, 10, 3]);
	return { id, orbit: { centre, radius, height, speed, phase }, position: null, target: centre };
}

// One entry per chapter, in scroll order. `cut: true` fades to black on the way in instead of
// flying, where a straight flight would pass through a floor or a roof.
// `sun` is the sun's elevation in degrees; the walk runs from morning to dusk.
export const STOPS = [
	{ ...orbit("arrive", { radius: 52, height: 30, speed: 0.025, phase: -1.2 }), sun: 18 },
	{ ...stand("lawn", [0, -22, -0.7], 286.8, 3), sun: 16 }, // P0, pulled back to take in the front
	{ ...stand("shade", [0, 1.9, 0], 286.8), sun: 14 }, // P1
	{ ...stand("pillars", [7.5, 1.9, 0], 196.8), sun: 12 }, // P2
	{ ...stand("stair", [8, 4.55, 2.6], 286.8), sun: 10, cut: true }, // P4
	// P5/P6 stand at gallery height, where the arch heads fill the view; these stand on the hall
	// floor under the galleries instead, so both storeys of the one room are in frame.
	{ ...stand("hall", [0.5, 8, 0], 286.8, 16), sun: 9, cut: true },
	{ ...stand("ceiling", [0.5, 10.5, 0], 286.8, 42), sun: 8 },
	{ ...orbit("dusk", { radius: 46, height: 18, speed: 0.018, phase: -1.9 }), sun: 2, cut: true },
];

// Evidence tiers are the suffix of each material name in the model, e.g. ARCH_CUSPED_GILT__CONFIRMED.
export const TIERS = {
	recorded: { color: "#7fd1b9", match: ["CONFIRMED", "CONFIRMED-FOR-1792"] },
	today: { color: "#c9c4bc", match: ["PRESENT-STATE"] },
	estimated: { color: "#e8b04a", match: ["DIM-INFERRED"] },
	// PATTERN-CONFIRMED: the idiom is evidenced, but what was painted on this ceiling is not
	// recorded (see the monument page), so it reads as a reconstructed style, not a record.
	style: { color: "#e0785c", match: ["DECORATION-RECONSTRUCTED", "PATTERN-CONFIRMED"] },
	setting: { color: "#4a4a4a", match: ["SCENE-SHELL", "IMAGINED"] },
};

export function tierOf(materialName = "") {
	const suffix = materialName.split("__")[1] || "";
	for (const [key, tier] of Object.entries(TIERS)) {
		if (tier.match.includes(suffix)) return key;
	}
	return "setting";
}
