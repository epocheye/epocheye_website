// Still water with a stone rim, built from world.json's "water" block. It belongs to the past era
// only, and follows the era wipe. No texture and no extra file: the surface is one small shader.

import { BufferAttribute, BufferGeometry, Color, DataTexture, Group, Mesh, NearestFilter, ShaderMaterial, SRGBColorSpace, Vector3 } from "three";
import { createBakedMaterial } from "@/lib/play/world/bakedMaterial";
import { insidePolygon } from "@/lib/play/world/terrain";

const WATER_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
	vec4 w = modelMatrix * vec4(position, 1.0);
	vWorld = w.xyz;
	gl_Position = projectionMatrix * viewMatrix * w;
}`;

// The sky here is the past era's sky in the runtime, so the reflection matches what is overhead.
const WATER_FRAG = /* glsl */ `
precision highp float;
uniform float uFrom, uTo, uRadius, uTime, uFogDensity;
uniform vec3 uCenter, uFogThen, uSun, uDeep, uShallow;
varying vec3 vWorld;

vec3 sky(vec3 d) {
	float h = clamp(d.y, -0.05, 1.0);
	vec3 c = mix(vec3(1.0, 0.58, 0.34), mix(vec3(0.86, 0.42, 0.52), vec3(0.20, 0.25, 0.48), smoothstep(0.08, 0.62, h)), smoothstep(0.0, 0.16, h));
	float s = max(dot(d, uSun), 0.0);
	return c + vec3(1.0, 0.62, 0.28) * pow(s, 7.0) * 0.5;
}

void main() {
	float d = distance(vWorld, uCenter);
	float era = mix(uFrom, uTo, 1.0 - smoothstep(uRadius - 7.0, uRadius, d));
	if (era < 0.5) discard;
	vec3 toEye = cameraPosition - vWorld;
	float dist = length(toEye);
	vec3 V = toEye / dist;
	vec2 p = vWorld.xz;
	// Two slow, small ripples. Still water, not a stream.
	vec2 ripple = vec2(
		sin(p.x * 1.7 + p.y * 0.6 + uTime * 0.7) * 0.5 + sin(p.x * 3.1 - p.y * 2.2 - uTime * 0.9) * 0.3,
		cos(p.y * 1.4 - p.x * 0.7 + uTime * 0.6) * 0.5 + cos(p.y * 2.9 + p.x * 1.9 + uTime * 0.8) * 0.3
	) * 0.016;
	vec3 N = normalize(vec3(ripple.x, 1.0, ripple.y));
	vec3 R = reflect(-V, N);
	R.y = abs(R.y);
	float facing = max(dot(V, N), 0.0);
	float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
	vec3 body = mix(uShallow, uDeep, smoothstep(0.1, 0.8, facing));
	vec3 col = mix(body, sky(R), clamp(fresnel + 0.16, 0.0, 1.0));
	col += vec3(1.0, 0.64, 0.32) * pow(max(dot(R, uSun), 0.0), 220.0) * 1.5;
	float edge = abs(uTo - uFrom) * (1.0 - smoothstep(0.0, 9.0, abs(d - uRadius)));
	col += vec3(1.0, 0.62, 0.32) * edge * 0.6;
	col = mix(col, uFogThen, 1.0 - exp(-dist * uFogDensity));
	gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
	#include <colorspace_fragment>
}`;

// Top, inner and outer faces of the rim: one stone colour under three fixed shades, as baked light would give.
function rimTexture(stone) {
	const c = new Color(stone).convertLinearToSRGB();
	const data = new Uint8Array(12);
	[1, 0.56, 0.72].forEach((shade, i) => {
		data.set([c.r * shade * 255, c.g * shade * 255, c.b * shade * 255, 255], i * 4);
	});
	const t = new DataTexture(data, 3, 1);
	t.magFilter = t.minFilter = NearestFilter;
	t.colorSpace = SRGBColorSpace;
	t.needsUpdate = true;
	return t;
}

function buildGeometry(positions, uvs, indices) {
	const g = new BufferGeometry();
	g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	g.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	g.setAttribute("_class", new BufferAttribute(new Float32Array(positions.length / 3), 1));
	g.setIndex(indices);
	return g;
}

function surfaceGeometry(tanks, level) {
	const pos = [], uv = [], idx = [];
	for (const t of tanks) {
		const at = pos.length / 3;
		for (const [x, y] of t.edge) {
			pos.push(x, level, -y);
			uv.push(0, 0);
		}
		for (let i = 1; i + 1 < t.edge.length; i++) idx.push(at, at + i, at + i + 1);
	}
	return buildGeometry(pos, uv, idx);
}

function rimGeometry(tanks, { level, rim_top: top, rim_base: base }) {
	const pos = [], uv = [], idx = [];
	const quad = (a, b, c, d, face) => {
		const at = pos.length / 3;
		pos.push(...a, ...b, ...c, ...d);
		const u = (face + 0.5) / 3;
		uv.push(u, 0.5, u, 0.5, u, 0.5, u, 0.5);
		idx.push(at, at + 1, at + 2, at, at + 2, at + 3);
	};
	for (const t of tanks) {
		const n = t.edge.length;
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			const p = (q, y) => [q[0], y, -q[1]];
			quad(p(t.edge[i], top), p(t.rim[i], top), p(t.rim[j], top), p(t.edge[j], top), 0);
			quad(p(t.edge[i], level - 0.04), p(t.edge[i], top), p(t.edge[j], top), p(t.edge[j], level - 0.04), 1);
			quad(p(t.rim[i], top), p(t.rim[i], base), p(t.rim[j], base), p(t.rim[j], top), 2);
		}
	}
	return buildGeometry(pos, uv, idx);
}

export function buildWater(spec, uniforms, sun, detail) {
	const group = new Group();
	const material = new ShaderMaterial({
		vertexShader: WATER_VERT,
		fragmentShader: WATER_FRAG,
		toneMapped: false,
		uniforms: {
			uFrom: uniforms.uFrom,
			uTo: uniforms.uTo,
			uRadius: uniforms.uRadius,
			uCenter: uniforms.uCenter,
			uTime: uniforms.uTime,
			uFogDensity: uniforms.uFogDensity,
			uFogThen: uniforms.uFogThen,
			uSun: { value: new Vector3(...sun).normalize() },
			uDeep: { value: new Color(spec.deep) },
			uShallow: { value: new Color(spec.shallow) },
		},
	});
	const surface = new Mesh(surfaceGeometry(spec.tanks, spec.level), material);
	const rim = new Mesh(rimGeometry(spec.tanks, spec), createBakedMaterial(uniforms, { now: rimTexture(spec.stone), mode: "then", doubleSide: true, detail }));
	group.add(surface, rim);
	return group;
}

// Is a Blender (x, y) on the water or its rim? People and rides stay out.
export const inWater = (spec, x, y) => !!spec && spec.tanks.some((t) => insidePolygon(x, y, t.keep));
