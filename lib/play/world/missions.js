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
		resolved: [], // material classes brought back
		restored: [], // restoration ids brought back
		choices: {},
		vote: null,
		proof: false,
		proofSeen: false,
		revealed: false,
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

// The id of this site's historical era. Any other era id is today, unless eras.stages names it.
export function pastEraOf(data) {
	return data.eras?.past ?? data.missions?.find((m) => m.era && m.era !== "today")?.era ?? null;
}

// What an era looks like. eras.stages holds any era after the main past one: the same world, with
// its own grade, and its own rule for whether the crowd and the rides are there.
export function eraProfile(data, era) {
	const stage = data.eras?.stages?.[era];
	if (stage) return { past: true, muted: stage.muted ?? 0, crowd: !!stage.crowd, rides: !!stage.rides, dress: stage.dress || [] };
	if (era != null && era === pastEraOf(data)) return { past: true, muted: 0, crowd: true, rides: true, dress: [] };
	return { past: false, muted: 0, crowd: false, rides: false, dress: [] };
}

// Objectives the player is free to roam during, so a casual word or a ride cannot cut across
// a story, a choice, an era shift or a restoration.
export function allowsRoaming(objective) {
	if (objective?.kind === "look_at") return !objective.pano_node;
	return ["goto", "talk", "record", "ride", "sketch_compare", "climb"].includes(objective?.kind);
}

// A mission that opens with an era shift keeps the era it was entered from until the shift plays.
function eraOf(state, data) {
	const m = missionAt(state, data);
	if (m?.objectives?.[0]?.kind === "era") return state.era ?? m.era;
	return m?.era ?? state.era;
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
	const on = (kind) => o?.kind === kind;
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
			return advance({
				...state,
				resolved: [...new Set([...state.resolved, ...(o.classes || [])])],
				restored: o.restoration ? [...new Set([...state.restored, o.restoration])] : state.restored,
			}, data);
		case "era-shifted":
			if (o?.kind !== "era") return state;
			return advance({ ...state, era: o.to }, data);
		case "sketched":
			return on("sketch_compare") ? advance(state, data) : state;
		case "looked":
			return on("look_at") && action.objective === o.id ? advance(state, data) : state;
		case "climbed":
			return on("climb") ? advance(state, data) : state;
		case "ordered":
			return on("order") && action.beat === o.beat ? advance(state, data) : state;
		case "revealed":
			return on("reveal") ? advance({ ...state, revealed: true }, data) : state;
		case "proof":
			// The switch stays usable after its objective, so a player can flip back and compare.
			if (on("proof")) return { ...state, proof: !!action.on, proofSeen: true };
			return state.proofSeen ? { ...state, proof: !!action.on } : state;
		case "proved":
			return on("proof") ? advance({ ...state, proofSeen: true }, data) : state;
		case "voted":
			return on("vote") ? advance({ ...state, vote: action.option }, data) : state;
		case "ended":
			return on("ending") ? advance(state, data) : state;
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

// Which step of the mission is live, for the objective panel.
export function stepOf(state, data) {
	const m = missionAt(state, data);
	return m ? { n: state.objective + 1, of: m.objectives.length } : null;
}

// How far through the whole story's restorations this objective is.
export function restoreCount(data, objective) {
	const all = data.missions.flatMap((m) => m.objectives.filter((o) => o.kind === "restore"));
	return { n: all.findIndex((o) => o.id === objective.id) + 1, of: all.length };
}

// Where the waypoint points for the live objective, as Blender [x, y], or null.
// ridePosition(id) gives a ride's live position, since a ride stays where the player left it.
export function waypointFor(state, data, riding = null, ridePosition = null) {
	const o = objectiveAt(state, data);
	if (!o || panoFor(state, data)) return null;
	if (o.kind === "goto" || o.kind === "sketch_compare" || o.kind === "climb") return o.at;
	if (o.kind === "look_at") return o.from;
	if (o.kind === "talk") return data.npcs.find((n) => n.id === o.npc)?.at ?? null;
	if (o.kind === "record") return data.records.find((r) => r.id === o.record)?.at ?? null;
	if (o.kind === "ride") {
		if (riding === o.ride) return o.at;
		return ridePosition?.(o.ride) ?? data.rides.find((r) => r.id === o.ride)?.at ?? null;
	}
	return null;
}

// The panorama the player is standing in, or null when they are in the open world. It follows from
// the save alone, so a reload lands in the same room. `entering` is a restoration whose reveal is
// about to play: it opens its panorama before the objective is done.
export function panoFor(state, data, entering = false) {
	const m = missionAt(state, data);
	if (!m || state.phase === "intro" || state.phase === "done") return null;
	const upto = state.phase === "end" ? m.objectives.length : state.objective;
	let at = null;
	for (let i = 0; i < upto; i++) if (m.objectives[i].pano_node) at = m.objectives[i];
	const o = state.phase === "play" ? m.objectives[state.objective] : null;
	if (o?.pano_node && o.kind !== "climb" && (o.kind !== "restore" || at || entering)) at = o;
	return at ? { node: at.pano_node, target: at.pano_look || null, from: at.id } : null;
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
		const state = { ...initialWorldState(), ...s };
		// Saved at the end of a shorter story: carry on with the mission that has been added since.
		return state.phase === "done" && state.mission < data.missions.length - 1 ? nextMission(state, data) : state;
	} catch {
		return null;
	}
}
