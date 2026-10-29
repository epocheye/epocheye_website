"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import { usePalette } from "./theme";
import { stationWeight } from "./stations";
import { T, setCursor } from "./ui3d";

// "Brick by brick": the leaderboard is a plaza of brick towers, one per site.
// Every pre-order lays one brick, so the most-wanted site stands tallest. The
// towers stand on a ring you can drag round; the leader stands in front.

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

function Tower({ site, rank, count, bricks, selected, hovered, onHover, onSelect, leader }) {
	const t = usePalette();
	const height = 0.32 + Math.ceil(bricks / PER_COURSE) * (BRICK[1] + 0.03);
	return (
		<group
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
				onSelect(site.slug);
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
			<T font="mono" fontSize={0.13} letterSpacing={0.1} color={leader ? t.ochreText : selected ? t.accentText : t.textSoft} position={[0, 0.15, 0.46]}>
				{`#${String(rank + 1).padStart(2, "0")} · ${countLabel(count)}`}
			</T>
		</group>
	);
}

export default function Towers({ sites, counts, selected, hovered, onHover, onSelect, flash, progress, z, portrait }) {
	const t = usePalette();
	const { gl } = useThree();
	const plaza = useRef(null);
	const mesh = useRef(null);
	const spin = useRef({ angle: 0, velocity: 0, dragging: false, lastX: 0 });

	const ranked = sites.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 })).sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const layout = ranked.map((r, rank) => ({ ...r, rank, angle: angleFor(rank), bricks: bricksFor(r.n, max) }));

	// Per-instance animation state: where each brick is now, so new ones can fall in.
	const animRef = useRef(null);

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

	useFrame((_, delta) => {
		if (!animRef.current) animRef.current = { y: new Float32Array(MAX_INSTANCES), seen: new Uint8Array(MAX_INSTANCES) };
		const anim = animRef.current;
		const s = spin.current;
		if (!s.dragging) {
			s.angle += s.velocity;
			s.velocity *= Math.pow(0.04, delta); // inertia
			// Drift back so the leader faces the camera when left alone.
			if (Math.abs(s.velocity) < 0.0005) s.angle = THREE.MathUtils.damp(s.angle, 0, 0.6, delta);
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

		const m = mesh.current;
		if (!m) return;
		const pulse = flash?.at ? Math.max(0, 1 - (performance.now() - flash.at) / 2000) : 0;
		let i = 0;
		for (const tower of layout) {
			const tx = Math.sin(tower.angle) * RADIUS;
			const tz = Math.cos(tower.angle) * RADIUS;
			const isSel = selected === tower.site.slug;
			const isHov = hovered === tower.site.slug;
			for (let b = 0; b < tower.bricks && i < MAX_INSTANCES; b += 1, i += 1) {
				brickOffset(b, tmpPos);
				// New bricks fall into place; existing ones settle.
				if (!anim.seen[i]) {
					anim.y[i] = tmpPos.y + 6 + b * 0.15;
					anim.seen[i] = 1;
				}
				anim.y[i] = THREE.MathUtils.damp(anim.y[i], tmpPos.y, 5 + (b % 4), delta);
				tmpObj.position.set(tx + Math.cos(tower.angle) * tmpPos.x, anim.y[i], tz - Math.sin(tower.angle) * tmpPos.x);
				tmpObj.rotation.set(0, tower.angle, 0);
				const lift = (isHov || isSel ? 0.04 : 0) + (flash?.slug === tower.site.slug ? pulse * 0.12 : 0);
				tmpObj.scale.setScalar(1 + lift);
				tmpObj.updateMatrix();
				m.setMatrixAt(i, tmpObj.matrix);
				const base = tower.rank === 0 && tower.n > 0 ? t.ochre : b % 3 === 0 ? t.brickAlt : t.brick;
				tmpCol.set(base);
				if (isSel || isHov) tmpCol.lerp(tmpCol.clone().set("#ffffff"), 0.12);
				m.setColorAt(i, tmpCol);
			}
		}
		// Hide and reset unused instances so a tower that shrinks can regrow with a fall.
		for (let k = i; k < MAX_INSTANCES; k += 1) {
			if (!anim.seen[k]) break;
			anim.seen[k] = 0;
			tmpObj.position.set(0, -50, 0);
			tmpObj.updateMatrix();
			m.setMatrixAt(k, tmpObj.matrix);
		}
		m.count = i;
		m.instanceMatrix.needsUpdate = true;
		if (m.instanceColor) m.instanceColor.needsUpdate = true;
	});

	return (
		<group position={[0, 0, z - RADIUS]}>
			<group ref={plaza}>
				<instancedMesh ref={mesh} args={[undefined, undefined, MAX_INSTANCES]} frustumCulled={false}>
					<boxGeometry args={BRICK} />
					<meshStandardMaterial roughness={0.85} metalness={0} />
				</instancedMesh>
				{layout.map((tower) => (
					<group
						key={tower.site.slug}
						position={[Math.sin(tower.angle) * RADIUS, 0, Math.cos(tower.angle) * RADIUS]}
						rotation-y={tower.angle}
						userData={{ angle: tower.angle }}>
						<Tower
							site={tower.site}
							rank={tower.rank}
							count={counts ? tower.n : null}
							bricks={tower.bricks}
							leader={tower.rank === 0 && tower.n > 0}
							selected={selected === tower.site.slug}
							hovered={hovered === tower.site.slug}
							onHover={onHover}
							onSelect={onSelect}
						/>
					</group>
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
