"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import { usePalette } from "./theme";
import { stationDistance, stationWeight } from "./stations";
import { T, setCursor } from "./ui3d";

// "Brick by brick": the leaderboard is a plaza of brick towers, one per site.
// Every pre-order lays one brick, so the most-wanted site stands tallest. The
// towers stand on a ring you can drag round; the leader stands in front under
// a crown. The towers are laid brick by brick as the camera arrives, each
// brick landing in a puff of dust. Tap a tower and it lifts and turns to face
// you; tap it again to pre-order it.

const RADIUS = 9;
const STEP = THREE.MathUtils.degToRad(21);
const BRICK = [0.62, 0.26, 0.42];
const PER_COURSE = 2;
const MAX_BRICKS = 24; // above this, heights scale to the leader
const MAX_INSTANCES = 12 * MAX_BRICKS;

/** Slot angle for a rank: leader at the front, then alternating left and right. */
const angleFor = (rank) => (rank === 0 ? 0 : Math.ceil(rank / 2) * STEP * (rank % 2 ? -1 : 1));

const countLabel = (n) => (n == null ? "…" : n === 0 ? "BE THE FIRST" : n === 1 ? "1 BRICK" : `${n} BRICKS`);

function bricksFor(count, max) {
	if (!count) return 0;
	return max <= MAX_BRICKS ? count : Math.max(1, Math.round((count / max) * MAX_BRICKS));
}

/** Local position of brick i in a tower: two per course, courses offset like masonry. */
function brickOffset(i, out) {
	const course = Math.floor(i / PER_COURSE);
	const side = i % PER_COURSE;
	const shift = course % 2 ? 0.16 : -0.16;
	out.set((side - 0.5) * (BRICK[0] + 0.04) + shift, 0.32 + course * (BRICK[1] + 0.03) + BRICK[1] / 2, 0);
	return out;
}

const tmpObj = new THREE.Object3D();
const tmpPos = new THREE.Vector3();
const tmpCol = new THREE.Color();
const WHITE = new THREE.Color("#ffffff");

const DROP = 4; // bricks fall from this high
const GRAVITY = 26;
const SPIN_S = 1.2; // a tapped tower's turn
const PUFFS = 420; // dust particle pool
const PUFF_LIFE = 0.9;

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const PUFF_VERT = /* glsl */ `
	uniform float uPixelRatio;
	attribute float aAlpha;
	varying float vAlpha;
	void main() {
		vec4 mv = modelViewMatrix * vec4(position, 1.0);
		vAlpha = aAlpha;
		gl_PointSize = min(70.0 * uPixelRatio / max(-mv.z, 0.001), 9.0 * uPixelRatio);
		gl_Position = projectionMatrix * mv;
	}
`;
const PUFF_FRAG = /* glsl */ `
	uniform vec3 uColor;
	varying float vAlpha;
	void main() {
		float d = length(gl_PointCoord - 0.5);
		if (d > 0.5) discard;
		gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vAlpha);
	}
`;

/** A small ochre crown that floats and turns over the leader. */
function Crown(props) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame((state) => {
		const g = ref.current;
		if (!g) return;
		g.rotation.y = state.clock.elapsedTime * 0.8;
		g.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
	});
	const metal = <meshStandardMaterial color={t.ochre} metalness={0.55} roughness={0.3} emissive={t.ochre} emissiveIntensity={0.3} />;
	return (
		<group {...props}>
			<group ref={ref}>
				<mesh>
					<cylinderGeometry args={[0.36, 0.3, 0.16, 32, 1, true]} />
					{metal}
				</mesh>
				{Array.from({ length: 5 }, (_, i) => {
					const a = (i / 5) * Math.PI * 2;
					return (
						<group key={i} position={[Math.sin(a) * 0.33, 0.2, Math.cos(a) * 0.33]}>
							<mesh>
								<coneGeometry args={[0.07, 0.26, 12]} />
								{metal}
							</mesh>
							<mesh position-y={0.16}>
								<sphereGeometry args={[0.045, 12, 12]} />
								<meshStandardMaterial color={t.accent} emissive={t.accent} emissiveIntensity={0.4} />
							</mesh>
						</group>
					);
				})}
			</group>
		</group>
	);
}

/** A terracotta sash across the leader's top, rippling in the breeze. */
function Banner(props) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame((state) => {
		const pos = ref.current?.geometry.attributes.position;
		if (!pos) return;
		const time = state.clock.elapsedTime;
		for (let i = 0; i < pos.count; i += 1) pos.setZ(i, Math.sin(pos.getX(i) * 4 + time * 3) * 0.035);
		pos.needsUpdate = true;
	});
	return (
		<group {...props}>
			<mesh ref={ref}>
				<planeGeometry args={[1.75, 0.3, 24, 1]} />
				<meshStandardMaterial color={t.accent} roughness={0.7} side={THREE.DoubleSide} />
			</mesh>
			<T font="mono" fontSize={0.12} letterSpacing={0.24} color="#fff6ec" position-z={0.05}>
				MOST WANTED
			</T>
		</group>
	);
}

function Tower({ site, rank, count, bricks, selected, hovered, focused, onHover, onTap, leader, towerRef, angle }) {
	const t = usePalette();
	const height = 0.32 + Math.ceil(bricks / PER_COURSE) * (BRICK[1] + 0.03);
	return (
		<group
			ref={towerRef}
			position={[Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS]}
			rotation-y={angle}
			userData={{ angle }}
			onPointerOver={(e) => {
				e.stopPropagation();
				onHover(site.slug);
				setCursor("pointer");
			}}
			onPointerOut={() => {
				onHover(null);
				setCursor("");
			}}
			onClick={(e) => {
				// A drag across the plaza is not a pick.
				if (e.delta > 8) return;
				e.stopPropagation();
				onTap(site.slug);
			}}>
			{/* Hit volume for the whole tower, bricks or not. */}
			<mesh position={[0, Math.max(height, 1.4) / 2, 0]} visible={false}>
				<boxGeometry args={[1.8, Math.max(height, 1.4), 1]} />
			</mesh>
			{/* Plinth */}
			<mesh position={[0, 0.15, 0]}>
				<boxGeometry args={[1.7, 0.3, 0.9]} />
				<meshStandardMaterial color={selected ? t.accent : t.paper} roughness={0.8} />
			</mesh>
			{bricks === 0 && (
				<mesh position={[0, 0.32 + BRICK[1] / 2, 0]}>
					<boxGeometry args={[BRICK[0] * 2 + 0.04, BRICK[1], BRICK[2]]} />
					<meshBasicMaterial color={t.textMuted} wireframe transparent opacity={0.5} />
				</mesh>
			)}
			{leader && <Banner position={[0, Math.max(height - 0.32, 0.62), BRICK[2] / 2 + 0.04]} />}
			{leader && <Crown position={[0, height + 1.05, 0]} />}
			{/* Name over the tower; rank and count are printed on the plinth so the top stays clean. */}
			<T
				name="label"
				font="display"
				fontSize={hovered || selected ? 0.25 : 0.21}
				color={selected ? t.accentText : t.text}
				maxWidth={2.6}
				textAlign="center"
				lineHeight={1}
				anchorY="bottom"
				position={[0, height + 0.3, 0]}>
				{site.name.toUpperCase()}
			</T>
			<T
				font="mono"
				fontSize={0.13}
				letterSpacing={0.1}
				color={focused ? "#fff6ec" : leader ? t.ochreText : selected ? t.accentText : t.textSoft}
				position={[0, 0.15, 0.46]}>
				{focused ? "TAP AGAIN TO PRE-ORDER  >" : `#${String(rank + 1).padStart(2, "0")} · ${countLabel(count)}`}
			</T>
		</group>
	);
}

export default function Towers({ sites, counts, selected, hovered, onHover, onSelect, onChoose, flash, progress, z, portrait }) {
	const t = usePalette();
	const { gl } = useThree();
	const plaza = useRef(null);
	const mesh = useRef(null);
	const puffs = useRef(null);
	const towers = useRef({}); // slug -> tower group
	const spin = useRef({ angle: 0, velocity: 0, dragging: false, lastX: 0 });
	const turn = useRef({ slug: null, at: -1e9 }); // the tapped tower's spin
	// The tower tapped on this visit: lifted, turned to face you, ready to pre-order.
	const [focus, setFocus] = useState(null);
	const [puffBuffers] = useState(() => ({ pos: new Float32Array(PUFFS * 3), alpha: new Float32Array(PUFFS) }));
	const [puffUniforms] = useState(() => ({ uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } }));

	const ranked = sites.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const layout = ranked.map((r, rank) => ({ ...r, rank, angle: angleFor(rank), bricks: bricksFor(r.n, max) }));

	// Per-brick fall state, keyed by tower and brick so a re-rank never replays a fall.
	const animRef = useRef(null);

	const tap = (slug) => {
		if (focus === slug && selected === slug) {
			onChoose(slug);
			return;
		}
		setFocus(slug);
		onSelect(slug);
		turn.current = { slug, at: performance.now() / 1000 };
	};

	// Drag anywhere on the canvas spins the plaza, while the camera is here.
	useEffect(() => {
		const el = gl.domElement;
		const s = spin.current;
		const down = (e) => {
			if (stationWeight(progress.get(), 2) < 0.6) return;
			s.dragging = true;
			s.lastX = e.clientX;
			s.velocity = 0;
		};
		const move = (e) => {
			if (!s.dragging) return;
			const dx = e.clientX - s.lastX;
			s.lastX = e.clientX;
			s.velocity = dx * 0.006;
			s.angle += s.velocity;
		};
		const up = () => {
			s.dragging = false;
		};
		el.addEventListener("pointerdown", down);
		window.addEventListener("pointermove", move);
		window.addEventListener("pointerup", up);
		window.addEventListener("pointercancel", up);
		return () => {
			el.removeEventListener("pointerdown", down);
			window.removeEventListener("pointermove", move);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", up);
		};
	}, [gl, progress]);

	useFrame((state, delta) => {
		animRef.current ??= {
			bricks: new Map(), // "slug:i" -> { start, landed }
			arrived: false,
			built: false, // the first build has been scheduled
			lift: {},
			vel: new Float32Array(PUFFS * 3),
			born: new Float32Array(PUFFS).fill(-1e9),
			next: 0,
		};
		const anim = animRef.current;
		const now = performance.now() / 1000;
		// The plaza is laid when the camera first sets off towards it.
		if (!anim.arrived && stationDistance(progress.get(), 2) < 1) anim.arrived = true;

		const focusAngle = layout.find((l) => l.site.slug === focus)?.angle;
		const s = spin.current;
		if (!s.dragging) {
			s.angle += s.velocity;
			s.velocity *= Math.pow(0.04, delta); // inertia
			// Come to rest with the tapped tower, or the leader, facing the camera.
			if (Math.abs(s.velocity) < 0.0005) s.angle = THREE.MathUtils.damp(s.angle, focusAngle != null ? -focusAngle : 0, focusAngle != null ? 3 : 0.6, delta);
		}
		s.angle = THREE.MathUtils.clamp(s.angle, -STEP * 6.5, STEP * 6.5);
		if (plaza.current) {
			plaza.current.rotation.y = s.angle;
			// Names turned too far from the camera read backwards: only show the ones facing us.
			for (const g of plaza.current.children) {
				if (g.userData.angle == null) continue;
				const label = g.getObjectByName("label");
				if (label) label.visible = Math.cos(g.userData.angle + s.angle) > (portrait ? 0.8 : 0.35);
			}
		}

		const spawnPuff = (x, y, zz, n) => {
			const pos = puffs.current?.geometry.attributes.position.array;
			if (!pos) return;
			for (let k = 0; k < n; k += 1) {
				const j = anim.next;
				anim.next = (anim.next + 1) % PUFFS;
				const a = Math.random() * Math.PI * 2;
				const sp = 0.6 + Math.random() * 0.9;
				pos[j * 3] = x;
				pos[j * 3 + 1] = y;
				pos[j * 3 + 2] = zz;
				anim.vel[j * 3] = Math.cos(a) * sp;
				anim.vel[j * 3 + 1] = 0.25 + Math.random() * 0.6;
				anim.vel[j * 3 + 2] = Math.sin(a) * sp;
				anim.born[j] = now;
			}
		};

		const m = mesh.current;
		if (!m) return;
		const pulse = flash?.at ? Math.max(0, 1 - (performance.now() - flash.at) / 2000) : 0;
		let i = 0;
		for (const tower of layout) {
			const slug = tower.site.slug;
			const isSel = selected === slug;
			const isHov = hovered === slug;
			// Lift and turn the tapped tower; its bricks follow.
			const lift = (anim.lift[slug] = THREE.MathUtils.damp(anim.lift[slug] ?? 0, focus === slug ? 0.45 : 0, 6, delta));
			const turning = turn.current.slug === slug ? Math.min(1, (now - turn.current.at) / SPIN_S) : 1;
			const theta = tower.angle + easeInOut(turning) * Math.PI * 2;
			const g = towers.current[slug];
			if (g) {
				g.position.y = lift;
				g.rotation.y = theta;
			}
			const tx = Math.sin(tower.angle) * RADIUS;
			const tz = Math.cos(tower.angle) * RADIUS;
			const cos = Math.cos(theta);
			const sin = Math.sin(theta);
			for (let b = 0; b < tower.bricks && i < MAX_INSTANCES; b += 1, i += 1) {
				brickOffset(b, tmpPos);
				const key = `${slug}:${b}`;
				let brick = anim.bricks.get(key);
				if (!brick && anim.arrived) {
					// First build: laid in order, leader first, bottom course up. Later bricks drop at once.
					brick = { start: now + (anim.built ? 0.1 : tower.rank * 0.12 + b * 0.07), landed: -1 };
					anim.bricks.set(key, brick);
				}
				const dt = brick ? now - brick.start : -1;
				const fall = Math.max(0, DROP - 0.5 * GRAVITY * dt * dt);
				const x = tx + cos * tmpPos.x;
				const zz = tz - sin * tmpPos.x;
				if (brick && dt >= 0 && fall === 0 && brick.landed < 0) {
					brick.landed = now;
					spawnPuff(x, lift + tmpPos.y - BRICK[1] / 2, zz, 4);
				}
				// A landed brick squashes a little, then settles.
				const squash = brick && brick.landed > 0 ? 0.22 * Math.max(0, 1 - (now - brick.landed) / 0.2) : 0;
				const grow = (isHov || isSel ? 0.04 : 0) + (flash?.slug === slug ? pulse * 0.12 : 0);
				tmpObj.position.set(x, lift + tmpPos.y + fall - squash * BRICK[1] * 0.5, zz);
				tmpObj.rotation.set(0, theta, 0);
				if (dt < 0) tmpObj.scale.setScalar(0);
				else tmpObj.scale.set((1 + grow) * (1 + squash * 0.5), (1 + grow) * (1 - squash), (1 + grow) * (1 + squash * 0.5));
				tmpObj.updateMatrix();
				m.setMatrixAt(i, tmpObj.matrix);
				tmpCol.set(tower.rank === 0 && tower.n > 0 ? t.ochre : b % 3 === 0 ? t.brickAlt : t.brick);
				if (isSel || isHov) tmpCol.lerp(WHITE, 0.12);
				m.setColorAt(i, tmpCol);
			}
		}
		if (anim.arrived) anim.built = true;
		m.count = i;
		m.instanceMatrix.needsUpdate = true;
		if (m.instanceColor) m.instanceColor.needsUpdate = true;

		// Dust: drift out, rise a little, fade.
		const geo = puffs.current?.geometry;
		if (geo) {
			const pos = geo.attributes.position.array;
			const alpha = geo.attributes.aAlpha.array;
			const drag = Math.pow(0.05, delta);
			for (let j = 0; j < PUFFS; j += 1) {
				const age = now - anim.born[j];
				if (age > PUFF_LIFE) {
					alpha[j] = 0;
					continue;
				}
				pos[j * 3] += anim.vel[j * 3] * delta;
				pos[j * 3 + 1] += anim.vel[j * 3 + 1] * delta;
				pos[j * 3 + 2] += anim.vel[j * 3 + 2] * delta;
				anim.vel[j * 3] *= drag;
				anim.vel[j * 3 + 1] *= drag;
				anim.vel[j * 3 + 2] *= drag;
				alpha[j] = 0.55 * (1 - age / PUFF_LIFE);
			}
			geo.attributes.position.needsUpdate = true;
			geo.attributes.aAlpha.needsUpdate = true;
			const u = puffs.current.material.uniforms;
			u.uPixelRatio.value = state.gl.getPixelRatio();
			u.uColor.value.set(t.mode === "light" ? "#a98a74" : "#d8b597");
		}
	});

	return (
		<group position={[0, 0, z - RADIUS]}>
			<group ref={plaza}>
				<instancedMesh ref={mesh} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
					<boxGeometry args={BRICK} />
					<meshStandardMaterial roughness={0.85} metalness={0} />
				</instancedMesh>
				<points ref={puffs} frustumCulled={false}>
					<bufferGeometry>
						<bufferAttribute attach="attributes-position" args={[puffBuffers.pos, 3]} />
						<bufferAttribute attach="attributes-aAlpha" args={[puffBuffers.alpha, 1]} />
					</bufferGeometry>
					<shaderMaterial
						uniforms={puffUniforms}
						vertexShader={PUFF_VERT}
						fragmentShader={PUFF_FRAG}
						transparent
						depthWrite={false}
					/>
				</points>
				{layout.map((tower) => (
					<Tower
						key={tower.site.slug}
						towerRef={(g) => {
							towers.current[tower.site.slug] = g;
						}}
						angle={tower.angle}
						site={tower.site}
						rank={tower.rank}
						count={counts ? tower.n : null}
						bricks={tower.bricks}
						leader={tower.rank === 0 && tower.n > 0}
						selected={selected === tower.site.slug}
						hovered={hovered === tower.site.slug}
						focused={focus === tower.site.slug && selected === tower.site.slug}
						onHover={onHover}
						onTap={tap}
					/>
				))}
				{/* The plaza floor */}
				<mesh rotation-x={-Math.PI / 2} position-y={0.005}>
					<ringGeometry args={[RADIUS - 1.4, RADIUS + 1.4, 128]} />
					<meshStandardMaterial color={t.sand} roughness={0.9} transparent opacity={0.7} />
				</mesh>
			</group>
			<group position={[0, portrait ? 7.4 : 6.8, RADIUS]}>
				<T font="mono" fontSize={0.17} letterSpacing={0.3} color={t.accentText} position={[0, 0.85, 0]}>
					THE MOST WANTED
				</T>
				<T font="display" fontSize={0.62} color={t.text} position={[0, 0.25, 0]}>
					BRICK BY BRICK
				</T>
				<T font="body" fontSize={0.2} color={t.textSoft} maxWidth={portrait ? 5.4 : 8} textAlign="center" anchorY="top" position={[0, -0.25, 0]}>
					Every pre-order lays a brick. The tallest tower gets built first. Drag to walk the plaza, tap a tower to pick it.
				</T>
			</group>
		</group>
	);
}
