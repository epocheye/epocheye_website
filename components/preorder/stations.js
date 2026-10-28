// The page is one camera flight down a corridor of the grid. Each station is a
// stop on it; scroll progress (0 → 1) moves the camera from one to the next.
// `look` is what the camera faces; `from` is the direction it views it from;
// `frame` is the [width, height] in world units that must fit on screen, in
// landscape and in portrait; `lookPortrait` overrides `look` on tall screens.
export const STATIONS = [
	{ id: "hero", label: "Pre-order", look: [0, 4, 0], from: [0, 0.26, 1], frame: [15, 10], framePortrait: [7.5, 12] },
	{ id: "how", label: "How it works", look: [0, 3.4, -32], lookPortrait: [0, 5.8, -32], from: [0, 0.12, 1], frame: [17.5, 7], framePortrait: [5.6, 12.2] },
	{ id: "board", label: "Most wanted", look: [0, 4.4, -64], from: [0, 0.14, 1], frame: [17.5, 11], framePortrait: [7.8, 12.5] },
	{ id: "form", label: "Your pre-order", look: [0, 3.4, -96], from: [0, 0.08, 1], frame: [16.5, 11], framePortrait: [6, 10.5] },
	{ id: "app", label: "Get the app", look: [0, 3.6, -126], from: [0, 0.18, 1], frame: [13, 8], framePortrait: [7.8, 9.5] },
];

export const STATION_COUNT = STATIONS.length;

/** Scroll progress at which the camera rests on station i. */
export const stationProgress = (i) => i / (STATION_COUNT - 1);

/** 1 at station i, falling to 0 a little before the neighbouring stations. */
export function stationWeight(p, i) {
	const d = Math.abs(p - stationProgress(i)) * (STATION_COUNT - 1);
	return 1 - smoothstep(0.25, 0.7, d);
}

export function nearestStation(p) {
	return Math.min(STATION_COUNT - 1, Math.max(0, Math.round(p * (STATION_COUNT - 1))));
}

export function smoothstep(a, b, x) {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

export const isPortrait = (aspect) => aspect < 0.9;
