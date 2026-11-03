// What each step of the homepage shows: the shape the cloud takes, how that
// shape is posed (`rx`/`ry` tilt, `spin` speed, `sway` amplitude, and the `w`×`h`
// box it must fit in), the data it waits on, the caption in the corner, and the
// labels pinned to it.
import {
	DESTINATIONS,
	GLOBE_ANCHORS,
	INDIA_ANCHORS,
	angkor,
	cards,
	colosseum,
	dust,
	logo,
	globe,
	india,
	network,
	phone,
	pyramids,
	taj,
	temple,
	terraces,
	video,
	wave,
} from "./shapes";

export const SHAPES = {
	dust: { make: (N) => dust(N), pose: { fixed: true } },
	temple: { make: (N, d) => temple(N, d.scan), needs: ["scan"], pose: { rx: 0.2, ry: 0.6, spin: 0.12, w: 6.6, h: 3.8 }, caption: "Konark Sun Temple · laser scan" },
	india: { make: (N) => india(N), pose: { rx: -0.95, ry: 0, w: 5.2, h: 4.2 }, caption: "India · 2 cities · 4 monuments live", anchors: INDIA_ANCHORS },
	phone: { make: (N, d) => phone(N, d.scan), needs: ["scan"], pose: { rx: 0.06, ry: -0.5, w: 3.4, h: 5 }, caption: "AR time travel" },
	wave: { make: (N) => wave(N), pose: { rx: 0.6, ry: -0.25, w: 6.8, h: 3.4 }, caption: "AI historian · English + Hindi" },
	cards: { make: (N) => cards(N), pose: { rx: 0.05, ry: -0.35, w: 5.2, h: 4.6 }, caption: "Sourced · every card" },
	pyramids: { make: (N) => pyramids(N), pose: { rx: 0.22, ry: 0.55, spin: 0.08, w: 6.6, h: 3.4 }, caption: "Pyramids of Giza · 29.98°N 31.13°E" },
	colosseum: { make: (N) => colosseum(N, 1), pose: { rx: 0.62, ry: 0.2, spin: 0.07, w: 5.8, h: 3.8 }, caption: "Colosseum · 41.89°N 12.49°E" },
	taj: { make: (N) => taj(N), pose: { rx: 0.12, ry: 0.4, spin: 0.1, w: 5, h: 4.2 }, caption: "Taj Mahal · 27.17°N 78.04°E" },
	video: { make: (N) => video(N), pose: { rx: 0, ry: 0, w: 7.2, h: 4.2 }, caption: "AR prototype · live footage" },
	rome: { make: (N) => colosseum(N, 0), pose: { rx: 0.5, ry: 0.2, spin: 0.07, w: 5.8, h: 3.8 }, caption: "Colosseum · 80 AD" },
	angkor: { make: (N) => angkor(N), pose: { rx: 0.25, ry: 0.5, spin: 0.1, w: 5.2, h: 4.2 }, caption: "Angkor Wat · 1150" },
	terraces: { make: (N) => terraces(N), pose: { rx: 0.35, ry: 0.3, spin: 0.08, w: 6.4, h: 3.6 }, caption: "Machu Picchu · 1450" },
	globe: { make: (N, d) => globe(N, d.geo), needs: ["geo"], pose: { rx: 0, ry: 0, w: 5.6, h: 5.6, globe: true }, caption: "8 sites · 5 continents · 177 countries", anchors: GLOBE_ANCHORS },
	network: { make: (N) => network(N), pose: { rx: 0.1, ry: 0, spin: 0.07, w: 7.6, h: 4.8 }, caption: "The creator network" },
	logo: { make: (N, d) => logo(N, d.mark), needs: ["mark"], pose: { rx: 0, ry: -0.15, sway: 0.45, w: 6, h: 6 }, caption: "Epocheye" },
};

/** The four eras of "how it works", in timeline order. */
export const ERAS = [
	{ shape: "rome", year: "80 AD", label: "Reconstructing · Colosseum, 80 AD" },
	{ shape: "angkor", year: "1150", label: "Standing · Angkor Wat, 1150" },
	{ shape: "terraces", year: "1450", label: "Built · Machu Picchu, 1450" },
	{ shape: "phone", year: "Today", label: "Today · explore it in AR" },
];

export { DESTINATIONS };

/**
 * Shared, mutable UI state the DOM writes and the scene reads every frame,
 * outside React so frames never re-render: the timeline position (0–3), the
 * picked destination, the hovered city.
 */
export const ui = { era: 0, destination: 0, city: -1, heldUntil: 0 };

/** DOM labels pinned to points in the cloud, by anchor id; the frame loop positions them. */
export const labelEls = {};
