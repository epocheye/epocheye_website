// The page is one camera flight down a corridor, through a holographic ring
// between each pair of stations. Scroll progress (0 → 1) moves the camera.
// `look` is what the camera faces; `from` is the direction it views it from;
// `frame` is the [width, height] in world units that must fit on screen, in
// landscape and in portrait; `lookPortrait` overrides `look` on tall screens.
// `lift` / `liftPortrait`: how far the camera rises on the way to the next
// station, to clear what stands between them (default 0.8).
export const STATIONS = [
	{ id: "hero", label: "Pre-order", look: [0, 3.4, 0], lookPortrait: [0, 4.6, 0], from: [0, 0.12, 1], frame: [16.5, 10], framePortrait: [8, 13.5] },
	{ id: "how", label: "How it works", look: [0, 3.6, -34], lookPortrait: [0, 6.2, -34], from: [0, 0.08, 1], frame: [17, 8], framePortrait: [6, 14], lift: 5, liftPortrait: 9 },
	{ id: "board", label: "Most wanted", look: [0, 5.2, -68], from: [0, 0.1, 1], frame: [17.5, 12.6], framePortrait: [7.8, 13.6], lift: 7, liftPortrait: 9 },
	{ id: "form", label: "Your pre-order", look: [0, 4.9, -102], from: [0, 0.05, 1], frame: [12, 12.2], framePortrait: [6.4, 12.4] },
	{ id: "app", label: "Get the app", look: [0, 3.8, -134], from: [0, 0.08, 1], frame: [13, 9], framePortrait: [7.5, 11] },
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

/** Scroll progress shared between the scroll driver and the 3D scene, outside React state. */
export function createProgress() {
	const store = { value: 0, get: () => store.value };
	return store;
}
