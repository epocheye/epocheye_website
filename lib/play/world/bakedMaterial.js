// The one world shader. Light is already baked into the textures, so it costs almost nothing:
// sample, pick the era, apply the grade and the haze. The era wipe spreads out from the player.

import { Color, DoubleSide, ShaderMaterial, Vector3 } from "three";

export const CLASS_IDS = { stone: 1, mud: 2, teak: 3 };

// Shared by every material, so one write moves the whole world.
export function createWorldUniforms() {
	return {
		uFrom: { value: 0 }, // era outside the wipe: 0 today, 1 for 1791
		uTo: { value: 0 }, // era inside the wipe
		uRadius: { value: 0 },
		uCenter: { value: new Vector3() },
		uResolved: { value: [0, 0, 0, 0, 0] }, // per material class: 0 unresolved, 1 restored
		uResolveY: { value: 12 }, // height the restoration has climbed to
		uTime: { value: 0 },
		uFogNow: { value: new Color("#c9d6dc") },
		uFogThen: { value: new Color("#f0a36b") },
		uFogDensity: { value: 0.0042 },
	};
}

const VERT = /* glsl */ `
attribute float _class;
varying vec2 vUv;
varying vec3 vWorld;
varying float vClass;
void main() {
	vUv = uv;
	#ifdef USE_INSTANCING
		vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
	#else
		vec4 w = modelMatrix * vec4(position, 1.0);
	#endif
	vWorld = w.xyz;
	vClass = _class;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tNow;
uniform sampler2D tThen;
uniform float uFrom, uTo, uRadius, uResolveY, uTime, uFogDensity;
uniform float uResolved[5];
uniform vec3 uCenter, uFogNow, uFogThen;
varying vec2 vUv;
varying vec3 vWorld;
varying float vClass;

float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }

vec3 gradeThen(vec3 c) {
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	vec3 shadow = vec3(0.30, 0.17, 0.34), light = vec3(1.10, 0.93, 0.72);
	c = mix(c * mix(shadow * 2.2, vec3(1.0), smoothstep(0.0, 0.32, l)), c * light, smoothstep(0.25, 0.95, l));
	return mix(vec3(l), c, 1.14);
}
vec3 gradeNow(vec3 c) {
	float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
	return mix(vec3(l), c, 0.8) * vec3(0.97, 1.0, 1.04);
}

void main() {
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
	#ifdef HAS_CLASSES
		int k = int(vClass + 0.5);
		float done = k > 0 && k < 5 ? uResolved[k] : 1.0;
		// In 1791 the Epocheye has not resolved the building yet: a pale scan, until it is restored.
		float climbing = 1.0 - smoothstep(uResolveY - 1.4, uResolveY, vWorld.y);
		float solid = mix(1.0 - era, 1.0, done * climbing);
		float l = dot(col, vec3(0.3, 0.6, 0.1));
		float lines = 0.5 + 0.5 * sin(vWorld.y * 16.0 - uTime * 1.6);
		vec3 scan = mix(vec3(0.17, 0.27, 0.33), vec3(0.62, 0.86, 0.9), l) + vec3(0.05, 0.1, 0.11) * lines;
		col = mix(scan, col, solid);
		float rim = done > 0.5 ? (1.0 - smoothstep(0.0, 1.4, abs(vWorld.y - uResolveY))) * step(uResolveY, 11.5) : 0.0;
		col += vec3(1.0, 0.72, 0.34) * rim * 0.9;
	#endif
	col = mix(gradeNow(col), gradeThen(col), era);
	float edge = abs(uTo - uFrom) * (1.0 - smoothstep(0.0, 9.0, abs(d - uRadius)));
	col += vec3(1.0, 0.62, 0.32) * edge * (0.45 + 0.55 * hash(floor(vWorld * 3.0)));
	float dist = distance(vWorld, cameraPosition);
	float fog = 1.0 - exp(-dist * uFogDensity);
	col = mix(col, mix(uFogNow, uFogThen, era), fog);
	gl_FragColor = vec4(col, 1.0);
	#include <colorspace_fragment>
}`;

// mode: "both" (today and 1791), "then" (1791 only), "now" (today only)
export function createBakedMaterial(uniforms, { now, then = null, mode = "both", classes = false, cutout = false, doubleSide = false }) {
	const defines = {};
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
		uniforms: { ...uniforms, tNow: { value: now }, tThen: { value: then } },
	});
}
