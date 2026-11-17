// The anonymous Play player, in the browser. A random id kept in localStorage; nothing else.
// No account, no cookie. If storage is blocked (private mode, a strict browser) the id lives
// for this page only, and the game still works.
//
// Also kept here, per browser tab (sessionStorage): the creator code from a ?c=<code> link and
// where the player came from. Neither is ever shown to the player.

export const ANON_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;
export const CREATOR_CODE_RE = /^[A-Za-z0-9_-]{2,32}$/;
export const SOURCE_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const ANON_KEY = "play:anon";
const CODE_KEY = "play:c";
const SOURCE_KEY = "play:src";

let memoryId = null;
let memoryCode = null;
let memorySource = null;

function randomId() {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function read(store, key) {
	try {
		return window[store].getItem(key);
	} catch {
		return null;
	}
}

function write(store, key, value) {
	try {
		window[store].setItem(key, value);
	} catch {
		// Storage blocked: the value lives in memory for this page.
	}
}

export function anonId() {
	if (typeof window === "undefined") return null;
	const stored = read("localStorage", ANON_KEY);
	if (stored && ANON_ID_RE.test(stored)) return stored;
	if (!memoryId) memoryId = randomId();
	write("localStorage", ANON_KEY, memoryId);
	return memoryId;
}

// Makes this browser play as the given anonymous id (used by the email link that carries a game
// to another device). Returns false for an id of the wrong shape.
export function setAnonId(id) {
	if (typeof window === "undefined" || typeof id !== "string" || !ANON_ID_RE.test(id)) return false;
	memoryId = id;
	write("localStorage", ANON_KEY, id);
	return true;
}

// Reads ?c=<code> from the current address. The first code seen in this tab is kept.
export function captureArrival() {
	if (typeof window === "undefined") return;
	try {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("c");
		if (code && CREATOR_CODE_RE.test(code) && !creatorCode()) {
			memoryCode = code.toUpperCase();
			write("sessionStorage", CODE_KEY, memoryCode);
		}
		if (!source()) {
			let src = params.get("src") || params.get("utm_source") || "";
			if (!src && document.referrer) {
				try {
					const ref = new URL(document.referrer);
					if (ref.origin !== window.location.origin) src = ref.hostname.replace(/^www\./, "");
				} catch {
					src = "";
				}
			}
			src = String(src || "direct").toLowerCase().slice(0, 64);
			memorySource = SOURCE_RE.test(src) ? src : "other";
			write("sessionStorage", SOURCE_KEY, memorySource);
		}
	} catch {
		// Nothing to keep.
	}
}

export function creatorCode() {
	if (typeof window === "undefined") return null;
	const v = read("sessionStorage", CODE_KEY) || memoryCode;
	return v && CREATOR_CODE_RE.test(v) ? v : null;
}

export function source() {
	if (typeof window === "undefined") return null;
	const v = read("sessionStorage", SOURCE_KEY) || memorySource;
	return v && SOURCE_RE.test(v) ? v : null;
}

// The browser's Do Not Track or Global Privacy Control signal. When on, no analytics are sent.
export function doNotTrack() {
	if (typeof navigator === "undefined") return false;
	try {
		const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
		return dnt === "1" || dnt === "yes" || navigator.globalPrivacyControl === true;
	} catch {
		return false;
	}
}
