// The one world shader. Light is already baked into the textures, so it costs almost nothing:
// sample, pick the era, apply the grade and the haze. The era wipe spreads out from the player.

import { Color, DataTexture, DoubleSide, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, ShaderMaterial, Vector3 } from "three";

export const CLASS_IDS = { stone: 1, mud: 2, teak: 3 };

// uResolveY once a restoration has finished: above anything a site can hold.
export const RESOLVED_Y = 10000;

// Shared by every material, so one write moves the whole world.
export function createWorldUniforms() {
	return {
		uFrom: { value: 0 }, // era outside the wipe: 0 today, 1 for the historical era
		uTo: { value: 0 }, // era inside the wipe
		uMuteFrom: { value: 0 }, // how far a later past era has drained the colour, outside the wipe
		uMuteTo: { value: 0 }, // and inside it
		uRadius: { value: 0 },
		uCenter: { value: new Vector3() },
		uResolved: { value: [0, 0, 0, 0, 0] }, // per material class: 0 unresolved, 1 restored
		uResolveY: { value: RESOLVED_Y }, // height the restoration has climbed to
		uTime: { value: 0 },
		uFogNow: { value: new Color("#c9d6dc") },
		uFogThen: { value: new Color("#e8b48e") }, // a soft late-afternoon haze, not an orange wall
		uFogDensity: { value: 0.0035 },
		uDetailScale: { value: 0.43 }, // repeats of the ground grain per metre
	};
}

const VERT = /* glsl */ `
attribute float _class;
varying vec2 vUv;
varying vec3 vWorld;
varying float vClass;
#ifdef FLATTEN
uniform float uFrom, uTo, uRadius, uFlatY;
uniform vec3 uCenter;
#endif
void main() {
	vUv = uv;
	#ifdef USE_INSTANCING
		vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
	#else
		vec4 w = modelMatrix * vec4(position, 1.0);
	#endif
	#ifdef FLATTEN
		// Today the ditch and the banks are gone: the ground is level, and the era wipe carries it.
		float wipe = 1.0 - smoothstep(uRadius - 7.0, uRadius, distance(w.xyz, uCenter));
		w.y = mix(uFlatY, w.y, mix(uFrom, uTo, wipe));
	#endif
	vWorld = w.xyz;
	vClass = _class;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tNow;
uniform sampler2D tThen;
uniform sampler2D tDetail;
uniform float uFrom, uTo, uMuteFrom, uMuteTo, uRadius, uResolveY, uTime, uFogDensity, uDetailScale;
uniform float uResolved[5];
uniform vec3 uCenter, uFogNow, uFogThen;
varying vec2 vUv;
varying vec3 vWorld;
varying float vClass;
#ifdef HOLES
uniform vec4 uHoles[HOLES];
uniform int uHoleCount;
#endif

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

// The atlases are already tone mapped through the scene's own view, so both grades stay gentle.
// The past is late afternoon: sunlit faces warm, shade a little cooler and lifted so a front in
// shade still reads. The old grade tinted shade purple and doubled it, which turned the ground into
// red and purple blotches and the palace front to mud.
vec3 gradeThen(vec3 c) {
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	vec3 warm = c * vec3(1.10, 0.99, 0.84);
	vec3 shade = c * vec3(0.97, 0.98, 1.03) + vec3(0.010, 0.009, 0.010);
	c = mix(shade, warm, smoothstep(0.04, 0.45, l));
	return mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.05);
}
// Today: the bake as it is, a touch cooler.
vec3 gradeNow(vec3 c) {
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	return mix(vec3(l), c, 0.97) * vec3(0.99, 1.0, 1.015);
}

void main() {
	#ifdef HOLES
		// A coarse layer gives way wherever a cell's full detail is standing. (x0, y0, x1, y1), Blender axes.
		for (int i = 0; i < uHoleCount; i++) {
			vec4 h = uHoles[i];
			if (vWorld.x > h.x && vWorld.x < h.z && -vWorld.z > h.y && -vWorld.z < h.w) discard;
		}
	#endif
	float d = distance(vWorld, uCenter);
	float inside = 1.0 - smoothstep(uRadius - 7.0, uRadius, d);
	float era = mix(uFrom, uTo, inside);
	#ifdef ERA_THEN_ONLY
		if (era < 0.5) discard;
	#endif
	#ifdef ERA_NOW_ONLY
		if (era >= 0.5) discard;
	#endif
	vec4 sNow = texture2D(tNow, vUv);
	#ifdef USE_CUTOUT
		if (sNow.a < 0.5) discard;
	#endif
	vec3 col = sNow.rgb;
	#ifdef HAS_THEN
		col = mix(col, texture2D(tThen, vUv).rgb, era);
	#endif
	#ifdef HAS_DETAIL
		// The ground atlas is broad. Fine grain near the player keeps it from looking soft. One octave
		// only, and gentle: a second, ten-metre octave read as blotches.
		float near = 1.0 - smoothstep(10.0, 48.0, distance(vWorld, cameraPosition));
		float grain = texture2D(tDetail, vWorld.xz * uDetailScale).r;
		col *= mix(1.0, 0.78 + grain * 0.44, near);
	#endif
	#ifdef HAS_CLASSES
		int k = int(vClass + 0.5);
		float done = k >= 0 && k < 5 ? uResolved[k] : 1.0;
		// In the past the Epocheye has not resolved the building yet: a pale scan, until it is restored.
		float climbing = 1.0 - smoothstep(uResolveY - 1.4, uResolveY, vWorld.y);
		float solid = mix(1.0 - era, 1.0, done * climbing);
		float l = dot(col, vec3(0.3, 0.6, 0.1));
		float lines = 0.5 + 0.5 * sin(vWorld.y * 7.0 - uTime * 1.4);
		float scanFade = 1.0 - smoothstep(10.0, 34.0, distance(vWorld, cameraPosition));
		vec3 scan = mix(vec3(0.035, 0.085, 0.12), vec3(0.30, 0.56, 0.62), pow(l, 0.8)) + vec3(0.012, 0.05, 0.06) * lines * scanFade;
		col = mix(scan, col, solid);
		float rim = done > 0.5 ? 1.0 - smoothstep(0.0, 1.4, abs(vWorld.y - uResolveY)) : 0.0;
		col += vec3(1.0, 0.72, 0.34) * rim * 0.9;
	#endif
	col = mix(gradeNow(col), gradeThen(col), era);
	// A later era in the same world: the sunset drains to a flat, papery daylight.
	float mute = mix(uMuteFrom, uMuteTo, inside);
	if (mute > 0.0) {
		float grey = dot(col, vec3(0.3, 0.6, 0.1));
		col = mix(col, vec3(grey) * vec3(1.03, 0.99, 0.91), mute * 0.74) * (1.0 - 0.05 * mute);
	}
	float edge = max(abs(uTo - uFrom), abs(uMuteTo - uMuteFrom)) * (1.0 - smoothstep(0.0, 9.0, abs(d - uRadius)));
	col += vec3(1.0, 0.62, 0.32) * edge * (0.45 + 0.55 * hash(floor(vWorld * 3.0)));
	float dist = distance(vWorld, cameraPosition);
	float fog = 1.0 - exp(-dist * uFogDensity);
	col = mix(col, mix(mix(uFogNow, uFogThen, era), vec3(0.76, 0.74, 0.68), mute * 0.8), fog);
	// The grade can push a channel below zero, and the sRGB step that follows calls pow on it.
	gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
	#include <colorspace_fragment>
}`;

// A small tiling grain for the ground, made here so there is no extra file to fetch.
export function createDetailTexture() {
	const size = 128;
	const base = new Float32Array(size * size);
	let seed = 1337;
	const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
	for (let i = 0; i < base.length; i++) base[i] = rnd();
	const data = new Uint8Array(size * size * 4);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let sum = 0;
			for (const [dx, dy, w] of [[0, 0, 0.4], [1, 0, 0.15], [-1, 0, 0.15], [0, 1, 0.15], [0, -1, 0.15]]) {
				sum += base[((y + dy + size) % size) * size + ((x + dx + size) % size)] * w;
			}
			const v = Math.round(Math.min(1, Math.max(0, (sum - 0.5) * 2.1 + 0.5)) * 255);
			data.set([v, v, v, 255], (y * size + x) * 4);
		}
	}
	const t = new DataTexture(data, size, size);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.magFilter = LinearFilter;
	t.minFilter = LinearMipmapLinearFilter;
	t.generateMipmaps = true;
	t.needsUpdate = true;
	return t;
}

// mode: "both" (today and the past), "then" (the past only), "now" (today only)
// flatY: this ground has relief in the past and lies level at that height today.
// holes: { uHoles, uHoleCount } rectangles this layer is cut away from.
export function createBakedMaterial(uniforms, { now, then = null, mode = "both", classes = false, cutout = false, doubleSide = false, detail = null, flatY = null, holes = null }) {
	const defines = {};
	if (flatY !== null) defines.FLATTEN = 1;
	if (holes) defines.HOLES = holes.uHoles.value.length;
	if (detail) defines.HAS_DETAIL = 1;
	if (then) defines.HAS_THEN = 1;
	if (classes) defines.HAS_CLASSES = 1;
	if (cutout) defines.USE_CUTOUT = 1;
	if (mode === "then") defines.ERA_THEN_ONLY = 1;
	if (mode === "now") defines.ERA_NOW_ONLY = 1;
	return new ShaderMaterial({
		defines,
		vertexShader: VERT,
		fragmentShader: FRAG,
		toneMapped: false,
		side: doubleSide || cutout ? DoubleSide : undefined,
		uniforms: { ...uniforms, ...(holes || {}), uFlatY: { value: flatY ?? 0 }, tNow: { value: now }, tThen: { value: then }, tDetail: { value: detail } },
	});
}
