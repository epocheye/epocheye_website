// Quality presets for the open world, chosen from the device and changeable in settings.

export const PRESETS = {
	low: { id: "low", label: "Low", dpr: 1, atlas: "small", shadows: false, bloom: false, antialias: false, people: 5, cards: 0.6, far: 760, stream: 120 },
	medium: { id: "medium", label: "Medium", dpr: 1.5, atlas: "small", shadows: false, bloom: true, antialias: true, people: 9, cards: 1, far: 860, stream: 170 },
	high: { id: "high", label: "High", dpr: 2, atlas: "large", shadows: true, bloom: true, antialias: true, people: 14, cards: 1, far: 1000, stream: 240 },
};

const STORE_KEY = "epocheye-play:world:quality";

export function isTouchDevice() {
	if (typeof window === "undefined") return false;
	return window.matchMedia?.("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
}

// Can this device run the open world at all? If not, the player gets Story view.
export function worldSupport() {
	if (typeof document === "undefined") return { ok: false, reason: "server" };
	const canvas = document.createElement("canvas");
	const gl = canvas.getContext("webgl2");
	if (!gl) return { ok: false, reason: "no-webgl2" };
	const memory = navigator.deviceMemory;
	if (memory && memory < 2) return { ok: false, reason: "low-memory" };
	const ext = gl.getExtension("WEBGL_debug_renderer_info");
	const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
	gl.getExtension("WEBGL_lose_context")?.loseContext();
	return { ok: true, gpu };
}

export function detectPreset(gpu = "") {
	const cores = navigator.hardwareConcurrency || 4;
	const memory = navigator.deviceMemory || 4;
	if (isTouchDevice()) {
		const strong = cores >= 8 && memory >= 6 && !/mali-g[0-9]{2}\b|adreno \(tm\) [1-5]/i.test(gpu);
		return strong ? "medium" : "low";
	}
	if (/swiftshader|llvmpipe|software/i.test(gpu)) return "low";
	return cores >= 6 ? "high" : "medium";
}

export function savedPreset() {
	try {
		const v = localStorage.getItem(STORE_KEY);
		return v && PRESETS[v] ? v : null;
	} catch {
		return null;
	}
}

export function savePreset(id) {
	try {
		localStorage.setItem(STORE_KEY, id);
	} catch {
		// Private windows can refuse storage. The choice then lasts for this visit.
	}
}
