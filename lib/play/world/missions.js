// The open-world mission engine: a pure reducer over missions.json.
// No site-specific code and no rendering. The world reports what the player did; this decides
// which objective is live. Saved after every objective (brief section 4).

export const SAVE_VERSION = 1;

export function saveKey(slug) {
	return `epocheye-play:world:${slug}:v${SAVE_VERSION}`;
}

export function initialWorldState() {
	return {
		mission: 0,
		objective: 0,
		phase: "intro", // intro | play | end | done
		era: null,
		resolved: [],
		choices: {},
		visited: [],
		askedApp: false,
	};
}

export function missionAt(state, data) {
	return data.missions[state.mission] || null;
}

export function objectiveAt(state, data) {
	const m = missionAt(state, data);
	return m && state.phase === "play" ? m.objectives[state.objective] || null : null;
}

// The id of this site's historical era. Any other era id is today.
export function pastEraOf(data) {
	return data.eras?.past ?? data.missions?.find((m) => m.era && m.era !== "today")?.era ?? null;
}

// Objectives the player is free to roam during, so a casual word or a ride cannot cut across
// a story, a choice, an era shift or a restoration.
export function allowsRoaming(objective) {
	return ["goto", "talk", "record", "ride"].includes(objective?.kind);
}

function eraOf(state, data) {
	return missionAt(state, data)?.era ?? state.era;
}

function advance(state, data) {
	const m = missionAt(state, data);
	const next = state.objective + 1;
	if (next < m.objectives.length) return { ...state, objective: next };
	if (m.end) return { ...state, phase: "end" };
	return nextMission(state, data);
}

function nextMission(state, data) {
	const n = state.mission + 1;
	if (n >= data.missions.length) return { ...state, phase: "done" };
	const moved = { ...state, mission: n, objective: 0, phase: "intro" };
	return { ...moved, era: eraOf(moved, data) };
}

// Each action names what happened. An action that does not match the live objective changes nothing,
// so a player wandering into a marker early cannot skip or break a mission.
export function reduceWorld(state, action, data) {
	const o = objectiveAt(state, data);
	switch (action.type) {
		case "begin":
			return state.phase === "intro" ? { ...state, phase: "play", era: eraOf(state, data) } : state;
		case "arrive":
			if (o?.kind === "goto") return advance(state, data);
			if (o?.kind === "ride" && action.riding === o.ride) return advance(state, data);
			return state;
		case "story-done":
			return o?.kind === "story" && action.objective === o.id ? advance(state, data) : state;
		case "talked":
			return o?.kind === "talk" && action.npc === o.npc ? advance(state, data) : state;
		case "found":
			return o?.kind === "record" && action.record === o.record ? advance(state, data) : state;
		case "chose":
			if (o?.kind !== "choice" || action.beat !== o.beat) return state;
			return advance({ ...state, choices: { ...state.choices, [o.beat]: action.option } }, data);
		case "restored":
			if (o?.kind !== "restore") return state;
			return advance({ ...state, resolved: [...new Set([...state.resolved, ...o.classes])] }, data);
		case "era-shifted":
			if (o?.kind !== "era") return state;
			return advance({ ...state, era: o.to }, data);
		case "end-dismissed":
			return state.phase === "end" ? nextMission(state, data) : state;
		case "visited":
			return state.visited.includes(action.place) ? state : { ...state, visited: [...state.visited, action.place] };
		case "asked-app":
			return { ...state, askedApp: true };
		default:
			return state;
	}
}

// Where the waypoint points for the live objective, as Blender [x, y], or null.
// ridePosition(id) gives a ride's live position, since a ride stays where the player left it.
export function waypointFor(state, data, riding = null, ridePosition = null) {
	const o = objectiveAt(state, data);
	if (!o) return null;
	if (o.kind === "goto") return o.at;
	if (o.kind === "talk") return data.npcs.find((n) => n.id === o.npc)?.at ?? null;
	if (o.kind === "record") return data.records.find((r) => r.id === o.record)?.at ?? null;
	if (o.kind === "ride") {
		if (riding === o.ride) return o.at;
		return ridePosition?.(o.ride) ?? data.rides.find((r) => r.id === o.ride)?.at ?? null;
	}
	return null;
}

export function serialiseWorld(state) {
	return JSON.stringify({ v: SAVE_VERSION, state });
}

// A save that does not fit the current missions file is ignored rather than trusted.
export function restoreWorld(json, data) {
	try {
		const parsed = JSON.parse(json);
		if (parsed?.v !== SAVE_VERSION) return null;
		const s = parsed.state;
		const m = data.missions[s?.mission];
		if (!m || !Number.isInteger(s.objective) || s.objective < 0 || s.objective >= m.objectives.length) return null;
		if (!["intro", "play", "end", "done"].includes(s.phase)) return null;
		return { ...initialWorldState(), ...s };
	} catch {
		return null;
	}
}
