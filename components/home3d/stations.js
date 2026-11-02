// Below the hero the homepage is one camera flight down a corridor of scenes.
// Scroll progress (0 → 1) moves the camera. Same model as /preorder:
// `look` is what the camera faces, `from` the direction it views it from, and
// `frame` the [width, height] in world units that must fit on screen
// (landscape / portrait). `id` doubles as the DOM anchor for that scene, so the
// existing #capabilities, #how-it-works … links keep working.
const GAP = 36;
const z = (i) => -i * GAP;

export const STATIONS = [
	{ id: "manifesto", label: "See through time", look: [0, 3.6, z(0)], lookPortrait: [0, 5.2, z(0)], from: [0, 0.1, 1], frame: [17, 10], framePortrait: [8, 15] },
	{ id: "where", label: "Where it works", look: [0, 3.3, z(1)], lookPortrait: [0, 6.2, z(1)], from: [0.18, 0.32, 1], frame: [17.5, 12.2], framePortrait: [8, 18], lift: 3 },
	{ id: "capabilities", label: "The stack", look: [0, 4, z(2)], lookPortrait: [0, 5, z(2)], from: [0, 0.1, 1], frame: [19, 10.5], framePortrait: [7.6, 20], lift: 2 },
	{ id: "collection", label: "The collection", look: [-0.4, 4.4, z(3)], lookPortrait: [0, 5.2, z(3)], from: [-0.12, 0.06, 1], frame: [19.5, 10.5], framePortrait: [8, 15], lift: 3 },
	{ id: "field", label: "In the field", look: [0, 4.4, z(4)], lookPortrait: [0, 4.8, z(4)], from: [0, 0.05, 1], frame: [17, 10], framePortrait: [8, 13], lift: 2 },
	{ id: "how-it-works", label: "How it works", look: [0, 4.4, z(5)], lookPortrait: [0, 7, z(5)], from: [0, 0.14, 1], frame: [19, 11], framePortrait: [8, 16.5], lift: 2 },
	{ id: "destinations", label: "Where we're headed", look: [0, 4.4, z(6)], lookPortrait: [0, 5.6, z(6)], from: [0.1, 0.08, 1], frame: [19, 10.5], framePortrait: [8, 15], lift: 3 },
	{ id: "creators", label: "The network", look: [0, 4.6, z(7)], lookPortrait: [0, 6.4, z(7)], from: [0, 0.08, 1], frame: [19, 10.5], framePortrait: [7.6, 17.5], lift: 2 },
	{ id: "team", label: "The team", look: [0, 4.6, z(8)], lookPortrait: [0, 7.8, z(8)], from: [0, 0.08, 1], frame: [18.5, 10.5], framePortrait: [7.6, 15] },
];

export const STATION_COUNT = STATIONS.length;
export const STATION_INDEX = Object.fromEntries(STATIONS.map((s, i) => [s.id, i]));
export const stationZ = (id) => STATIONS[STATION_INDEX[id]].look[2];
export const CORRIDOR_END = z(STATION_COUNT - 1);

/** Scroll progress at which the camera rests on station i. */
export const stationProgress = (i) => i / (STATION_COUNT - 1);

/** How many stations away the camera is from station i (signed: negative before it). */
export const stationOffset = (p, i) => (p - stationProgress(i)) * (STATION_COUNT - 1);

/** 1 at station i, falling to 0 a little before the neighbouring stations. */
export const stationWeight = (p, i) => 1 - smoothstep(0.25, 0.7, Math.abs(stationOffset(p, i)));

export const nearestStation = (p) => Math.min(STATION_COUNT - 1, Math.max(0, Math.round(p * (STATION_COUNT - 1))));

export function smoothstep(a, b, x) {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

export const isPortrait = (aspect) => aspect < 0.9;

/** Scroll progress shared between the scroll driver and the scene, outside React state. */
export function createProgress() {
	const store = { value: 0, get: () => store.value };
	return store;
}
