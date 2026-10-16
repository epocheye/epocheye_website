// The scroll journey through the palace model (public/virtual/palace-lite.glb).
//
// Coordinates are in the building's plan frame, from the reconstruction's own data
// (heritage_assets/.../output/palace_viewpoints.json and palace_walk.json): +X along the facade
// toward the NNE end, +Y into the building, +Z up, metres, origin at the centre of the main (ESE)
// facade at plinth-floor level. The GLB was exported from Blender (Z up) to glTF (Y up), so plan
// (x, y, z) is world (x, z, -y). Heights below are eye heights (floor + 1.6 m).
//
// The camera flies one continuous spline through every waypoint; no cuts. Stations are where a
// chapter holds. Route, from the walk data: lawn, up the front steps (palace_walk stairs[0]),
// through the colonnade (P1, P2), into the hall, up the NNE stair (stairs[1]: foot at y 9.5,
// head at y 5.3, first floor 2.6 m), along the front gallery, out through the front arch, and up.

export function planToWorld([x, y, z]) {
	return [x, z, -y];
}

// [position], [look target], optional station id
const W = (position, target, station) => ({ position: planToWorld(position), target: planToWorld(target), station });

export const WAYPOINTS = [
	W([-26, -46, 30], [0, 8, 2], "arrive"),
	W([-14, -40, 14], [0, 4, 3]),
	W([0, -22, 0.9], [0, 0, 4], "lawn"), // P0, pulled back to take in the front
	W([0, -9, 0.9], [0, 4, 2.4]),
	W([0, -2.5, 1.4], [0, 8, 2.2]), // top of the front steps
	W([0, 1.9, 1.6], [0, 12, 2.6], "shade"), // P1
	W([4, 2.2, 1.6], [-4, 1.9, 1.8]),
	W([7.5, 1.9, 1.6], [-2, 1.9, 1.9], "pillars"), // P2, looking down the length
	W([5.5, 4.2, 1.6], [0, 9, 2.5]),
	W([2.5, 6.5, 1.6], [0.5, 16, 3.8]),
	W([0.5, 8, 1.6], [0.5, 15.7, 3.8], "hall"), // on the hall floor: both storeys in frame
	W([0.5, 10.5, 1.6], [0.5, 16.4, 7], "ceiling"), // looking up at the painted ceiling
	W([4, 11.2, 1.6], [8, 10, 1.8]),
	W([7.3, 10.6, 1.6], [8, 6, 2.8]),
	W([8, 9.6, 1.7], [8, 5, 3.6]), // foot of the NNE stair
	W([8, 7.4, 2.9], [8, 4, 4.4]),
	W([8, 5.3, 4.2], [6, 3, 4.2]), // head of the stair
	W([8, 4.55, 4.2], [2, 9, 2.8], "stair"), // P4, looking down into the hall
	W([5, 1.8, 4], [2, -4, 3.6]),
	W([2, 0.4, 3.3], [2, -8, 3]), // through the front arch, where the balcony was
	W([2, -6, 4.5], [-5, -30, 6]),
	W([-8, -30, 14], [0, 6, 3]),
	W([-24, -42, 22], [0, 8, 3], "dusk"),
];

// One entry per chapter, in scroll order. `sun` is the sun's elevation in degrees: the walk runs
// from afternoon into dusk.
export const STOPS = [
	{ id: "arrive", sun: 18 },
	{ id: "lawn", sun: 16 },
	{ id: "shade", sun: 14 },
	{ id: "pillars", sun: 12 },
	{ id: "hall", sun: 10 },
	{ id: "ceiling", sun: 9 },
	{ id: "stair", sun: 8 },
	{ id: "dusk", sun: 3 },
];

// The hall volume, for the dust in the light: plan centre and size.
export const HALL = { centre: planToWorld([0.5, 11.5, 3]), size: [10, 5, 12] };

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
