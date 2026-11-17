// Narration for Epocheye Play. One clip per spoken segment. The pauses between clips are
// silence this module inserts itself, from pause_after_ms, so swapping the voice changes no timing.
// With sound off, or when a clip is missing, the same pauses run on reading-speed timings.

import { readingMs } from "@/lib/play/story/engine";

// A few samples of silence. Played inside the tap that turns sound on, so phones that
// need a gesture per audio element let later clips start from timers.
const SILENCE = "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAAAAA==";

async function getJson(url) {
	try {
		const r = await fetch(url, { cache: "no-cache" });
		if (!r.ok) return null;
		return await r.json();
	} catch {
		return null;
	}
}

// manifest.json is written by the voice pipeline. Accepts a list of clips, or a map of them,
// at the top level or under "clips". Returns Map(clipId -> entry).
export function readManifest(json) {
	const out = new Map();
	if (!json) return out;
	const src = Array.isArray(json) ? json : json.clips ?? json.lines ?? json.segments ?? json;
	if (Array.isArray(src)) {
		for (const e of src) {
			const id = e && (e.id || e.clip);
			if (id) out.set(String(id), e);
		}
	} else if (src && typeof src === "object") {
		for (const [id, e] of Object.entries(src)) {
			if (e && typeof e === "object" && !Array.isArray(e)) out.set(id, e);
		}
	}
	return out;
}

// A clip can be played when the manifest lists it and its words still match the story.
// The voice pipeline marks an entry "stale" when the line changed and the clip was not rendered again.
export function clipUsable(entry) {
	return !!entry && !entry.stale;
}

// Which voices does this pack have? audio/voices.json is the index: a list of folder names, or
// { voices: [...], default }. Without it the pack has no narration; the engine knows no voice names.
export async function discoverVoices(urls) {
	const listed = await getJson(urls.voices);
	let ids = [];
	let preferred = null;
	if (listed) {
		const raw = Array.isArray(listed) ? listed : listed.voices || [];
		ids = raw.map((v) => (typeof v === "string" ? v : v?.id || v?.folder || v?.name)).filter(Boolean);
		preferred = (!Array.isArray(listed) && (listed.default || listed.chosen)) || null;
	}
	const found = [];
	for (const id of ids) {
		const manifest = await getJson(urls.audioManifest(id));
		found.push({ id, manifest, clips: readManifest(manifest) });
	}
	const def = found.find((v) => v.id === preferred) || found.find((v) => v.manifest) || found[0] || null;
	return { voices: found, default: def ? def.id : null, listed: !!listed };
}

export function createNarrator(urls) {
	// Two players. One speaks while the other already holds the next clip, so a clip starts
	// the moment it is asked for and the gap before it is the directed pause, nothing more.
	const players = [null, null];
	let active = 0;
	let enabled = false;
	let voice = null; // { id, clips: Map, hasManifest }
	let token = 0;
	let timer = null;
	let release = null; // resolves whatever the current run is waiting on
	let upcoming = null; // first clip of the line most likely to come next
	let reserved = false; // the idle player is holding the next clip of the line being spoken
	const missing = new Set();
	const warm = new Map();

	function player(i) {
		if (!players[i] && typeof Audio !== "undefined") {
			players[i] = new Audio();
			players[i].preload = "auto";
		}
		return players[i];
	}

	function clipUrl(id) {
		if (!voice || !id || missing.has(id)) return null;
		if (!voice.hasManifest) return urls.audio(voice.id, id);
		const entry = voice.clips.get(id);
		if (!clipUsable(entry)) return null; // no clip, or its words are out of date: reading time instead
		const url = entry.file ? urls.file(`audio/${voice.id}/${entry.file}`) : urls.audio(voice.id, id);
		// A clip is rendered again under the same name. Its key changes with it, so an old copy is never played.
		return entry.key ? `${url}?k=${encodeURIComponent(entry.key)}` : url;
	}

	// Load a clip into the player that is not speaking.
	function prime(id) {
		const url = enabled ? clipUrl(id) : null;
		const a = url ? player(1 - active) : null;
		if (!a || a.dataset.url === url) return;
		a.dataset.url = url;
		a.src = url;
		a.load();
	}

	function wait(ms) {
		return new Promise((resolve) => {
			if (!(ms > 0)) return resolve();
			release = resolve;
			timer = setTimeout(resolve, ms);
		});
	}

	function playClip(url, id) {
		// Use the idle player if it already holds this clip, else load it into the current one.
		if (players[1 - active]?.dataset.url === url) active = 1 - active;
		const a = player(active);
		if (!a) return Promise.resolve(false);
		return new Promise((resolve) => {
			let settled = false;
			const done = (played) => {
				if (settled) return;
				settled = true;
				a.removeEventListener("ended", onEnded);
				a.removeEventListener("error", onError);
				resolve(played);
			};
			const onEnded = () => done(true);
			const onError = () => {
				missing.add(id);
				a.dataset.url = "";
				done(false);
			};
			a.addEventListener("ended", onEnded);
			a.addEventListener("error", onError);
			release = () => {
				a.pause();
				done(true);
			};
			if (a.dataset.url !== url) {
				a.dataset.url = url;
				a.src = url;
			} else if (a.currentTime > 0) {
				a.currentTime = 0;
			}
			const p = a.play();
			if (p && typeof p.catch === "function") {
				p.catch((err) => {
					// AbortError is our own pause() on a skip. Anything else means the clip cannot play.
					if (err && err.name === "AbortError") return;
					if (err && err.name === "NotSupportedError") missing.add(id);
					done(false);
				});
			}
		});
	}

	async function run(segments, my, handlers) {
		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (my !== token) return;
			handlers.onSegment?.(seg, i);
			const url = enabled ? clipUrl(seg.clip) : null;
			let played = false;
			if (url) {
				const speaking = playClip(url, seg.clip);
				// While this clip speaks, get the next one ready: the next clip of this line, or the next line.
				reserved = !!segments[i + 1];
				prime(reserved ? segments[i + 1].clip : upcoming);
				played = await speaking;
			}
			reserved = false;
			if (my !== token) return;
			if (!played) await wait(readingMs(seg.text));
			if (my !== token) return;
			await wait(seg.pause_after_ms ?? 0);
		}
		if (my === token) handlers.onDone?.();
	}

	const api = {
		get enabled() {
			return enabled;
		},
		get voice() {
			return voice ? voice.id : null;
		},
		// The address of the clip being spoken right now, or null. For the debug view and checks.
		get speaking() {
			const a = players.find((p) => p && !p.paused && !p.ended && p.dataset.url && p.dataset.url !== "");
			return a ? a.dataset.url : null;
		},
		// Call inside the tap that turns sound on.
		unlock() {
			for (const i of [0, 1]) {
				const a = player(i);
				if (!a) continue;
				try {
					a.dataset.url = "";
					a.src = SILENCE;
					const p = a.play();
					if (p && typeof p.catch === "function") p.catch(() => {});
				} catch {
					// Nothing to do: playback will fall back to silent timings.
				}
			}
		},
		setEnabled(on) {
			enabled = !!on;
			if (!enabled) for (const a of players) a?.pause();
		},
		setVoice(id, clips, hasManifest) {
			voice = id ? { id, clips: clips || new Map(), hasManifest: !!hasManifest } : null;
			missing.clear();
			warm.clear();
			upcoming = null;
		},
		has(clip) {
			return !!clipUrl(clip);
		},
		// Clips likely to be wanted soon, most likely first. The first is held ready in the idle
		// player once the current line reaches its last clip; the rest are fetched into the cache.
		preload(clipIds) {
			const ids = (clipIds || []).filter(Boolean);
			upcoming = ids[0] || null;
			if (!enabled || typeof Audio === "undefined") return;
			if (!reserved) prime(upcoming);
			for (const id of ids.slice(1)) {
				const url = clipUrl(id);
				if (!url || warm.has(url)) continue;
				const a = new Audio();
				a.preload = "auto";
				a.src = url;
				warm.set(url, a);
				if (warm.size > 8) warm.delete(warm.keys().next().value);
			}
		},
		// Plays segments in order: clip (or reading time), then its pause. Returns a cancel function.
		play(segments, handlers = {}) {
			api.stop();
			const my = ++token;
			run(segments || [], my, handlers);
			return () => {
				if (my === token) api.stop();
			};
		},
		stop() {
			token++;
			clearTimeout(timer);
			timer = null;
			const r = release;
			release = null;
			if (r) r();
			for (const a of players) a?.pause();
		},
		dispose() {
			api.stop();
			warm.clear();
			for (const i of [0, 1]) {
				const a = players[i];
				if (!a) continue;
				a.removeAttribute("src");
				a.load?.();
				players[i] = null;
			}
		},
	};
	return api;
}
