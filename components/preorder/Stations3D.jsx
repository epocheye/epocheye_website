"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, Text } from "@react-three/drei";

import { PLAY_STORE_URL } from "@/lib/site";
import { FONTS, FONT_SCALE, usePalette } from "./theme";
import { STATIONS, stationWeight } from "./stations";
import { Gate, HoloPanel, HoloRings, KonarkScan } from "./Holo";
import FormPanel from "./FormPanel";

const Z = STATIONS.map((s) => s.look[2]);
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

function T({ font = "body", fontSize, children, ...props }) {
	return (
		<Text
			font={FONTS[font]}
			fontSize={fontSize * FONT_SCALE[font]}
			anchorX="center"
			anchorY="middle"
			material-toneMapped={false}
			{...props}>
			{children}
		</Text>
	);
}

const setCursor = (v) => {
	document.body.style.cursor = v;
};

/** Reveal driven by how close the camera is to station i (0 → 1). */
function useArrival(ref, progress, i, apply) {
	useFrame((state, delta) => {
		if (ref.current) apply(ref.current, stationWeight(progress.get(), i), delta, state);
	});
}

export function Gates() {
	return STATIONS.slice(1).map((s) => <Gate key={s.id} z={s.look[2] + 16} />);
}

/* ───────────────────────── 00 · Hero ───────────────────────── */

export function HeroStation({ portrait, progress, intro }) {
	const t = usePalette();
	const title = useRef(null);
	const scan = useRef(null);
	// Points hold their shape at the hero and scatter as the camera leaves.
	const assemble = { get: () => intro.get() * (0.35 + 0.65 * stationWeight(progress.get(), 0)) };
	useFrame(() => {
		// Skip drawing 90k points once the hero is well behind the camera.
		if (scan.current) scan.current.visible = progress.get() < 0.3;
		const g = title.current;
		if (!g) return;
		const k = easeOut(intro.get() * 1.3 - 0.2);
		g.position.y = (portrait ? 0.8 : 3.4) - (1 - k) * 1.2;
		g.scale.setScalar((portrait ? 0.62 : 1) * (0.9 + 0.1 * k));
	});
	const cloud = portrait ? { position: [0, 5.2, -1], scale: 3.1 } : { position: [4.3, 2.3, -1.5], scale: 3.7 };
	return (
		<>
			<group ref={scan}>
				<KonarkScan assemble={assemble} position={cloud.position} scale={cloud.scale} size={portrait ? 16 : 19} />
			</group>
			<HoloRings radius={portrait ? 2.6 : 3.4} position={[cloud.position[0], 0.02, cloud.position[2]]} />
			<group position={[cloud.position[0], 0, cloud.position[2]]}>
				<T font="mono" fontSize={0.16} letterSpacing={0.2} color={t.amberText} position={[0, portrait ? 7.8 : 5.4, 0]}>
					SCAN · KONARK SUN TEMPLE · JAGAMOHANA
				</T>
			</group>
			<group ref={title} position={[portrait ? 0 : -6.9, 3.4, 0.5]}>
				<T font="mono" fontSize={0.2} letterSpacing={0.3} color={t.blueText} anchorX={portrait ? "center" : "left"} position={[0, 2.05, 0]}>
					EPOCHEYE // PRE-ORDER
				</T>
				<T font="display" fontSize={0.95} letterSpacing={-0.03} color={t.text} anchorX={portrait ? "center" : "left"} position={[0, 1.15, 0]}>
					PRE-ORDER
				</T>
				<T font="display" fontSize={0.95} letterSpacing={-0.03} color={t.amber} anchorX={portrait ? "center" : "left"} position={[0, 0.1, 0]}>
					THE PAST.
				</T>
				<T
					font="mono"
					fontSize={portrait ? 0.27 : 0.2}
					lineHeight={1.6}
					letterSpacing={0.08}
					color={t.textSoft}
					anchorX={portrait ? "center" : "left"}
					anchorY="top"
					textAlign={portrait ? "center" : "left"}
					maxWidth={portrait ? 9 : 6.4}
					position={[0, -0.75, 0]}>
					Pick the heritage site you want in Epocheye next. Every pre-order is a vote: the most-wanted site gets built
					first.
				</T>
			</group>
		</>
	);
}

/* ─────────────────────── 01 · How it works ─────────────────────── */

const STEPS = [
	["01", "PICK A SITE", "Choose a heritage site that isn't in Epocheye yet, or suggest your own."],
	["02", "PRE-ORDER IT", "Leave your name and email. There is nothing to pay today."],
	["03", "MOST-WANTED FIRST", "The sites with the most pre-orders get built first. When yours is ready, you see it first."],
];

function StepPanel({ index, n, title, body, position, rotationY, progress }) {
	const t = usePalette();
	const ref = useRef(null);
	useArrival(ref, progress, 1, (o, w) => {
		const k = easeOut(w * 1.5 - index * 0.18);
		o.rotation.y = rotationY + (1 - k) * 1.4 * (index % 2 ? -1 : 1);
		o.position.y = position[1] + (1 - k) * 2;
		o.scale.setScalar(0.6 + 0.4 * k);
	});
	return (
		<group ref={ref} position={position} rotation-y={rotationY}>
			<HoloPanel width={4.6} height={3.4} />
			<group position={[-1.95, 0, 0.02]}>
				<T font="mono" fontSize={0.42} color={t.amber} anchorX="left" position={[0, 1.05, 0]}>
					{n}
				</T>
				<T font="mono" fontSize={0.13} letterSpacing={0.2} color={t.blueText} anchorX="left" position={[0.9, 1.08, 0]}>
					{`STEP ${n} / 03`}
				</T>
				<T font="display" fontSize={0.3} color={t.text} anchorX="left" position={[0, 0.38, 0]}>
					{title}
				</T>
				<T fontSize={0.19} lineHeight={1.5} color={t.textSoft} anchorX="left" anchorY="top" maxWidth={3.9} position={[0, 0.05, 0]}>
					{body}
				</T>
			</group>
		</group>
	);
}

export function HowStation({ portrait, progress }) {
	const z = Z[1];
	const layout = portrait
		? STEPS.map((_, i) => ({ position: [0, 6.2 + (1 - i) * 3.7, z], rotationY: 0 }))
		: STEPS.map((_, i) => ({ position: [(i - 1) * 5.2, 3.6, z + Math.abs(i - 1) * 0.9], rotationY: (1 - i) * 0.24 }));
	return (
		<group scale={1}>
			{STEPS.map(([n, title, body], i) => (
				<StepPanel key={n} index={i} n={n} title={title} body={body} progress={progress} {...layout[i]} />
			))}
		</group>
	);
}

/* ─────────────────────── 02 · Most wanted ─────────────────────── */

// The leaderboard is a rack of holographic slabs, one per site, ranked top to
// bottom. Each slab's bar fills with its share of pre-orders; rows slide to
// their new rank when the counts change.
const ROW = 0.74;

const countLabel = (n) => (n == null ? "…" : n === 0 ? "BE THE FIRST" : n === 1 ? "1 PRE-ORDER" : `${n} PRE-ORDERS`);

function RackRow({ site, rank, count, max, portrait, selected, hovered, onHover, onSelect, flash }) {
	const t = usePalette();
	const row = useRef(null);
	const bar = useRef(null);
	const width = portrait ? 7.2 : 13.5;
	const y = 8.7 - (rank - 1) * ROW;
	const barX0 = portrait ? -3.35 : -1.6;
	const barMax = portrait ? 5.6 : 6.4;
	const share = max > 0 ? (count ?? 0) / max : 0;
	const active = selected || hovered;
	const leader = rank === 1 && count > 0;

	useFrame((_, delta) => {
		const r = row.current;
		if (!r) return;
		r.position.y = THREE.MathUtils.damp(r.position.y, y, 5, delta);
		const pulse = flash ? Math.max(0, 1 - (performance.now() - flash) / 1600) : 0;
		r.position.z = THREE.MathUtils.damp(r.position.z, active ? 0.45 : 0, 8, delta) + pulse * 0.4;
		const len = Math.max(0.04, barMax * share);
		const b = bar.current;
		b.scale.x = THREE.MathUtils.damp(b.scale.x, len, 3, delta);
		b.position.x = barX0 + b.scale.x / 2;
	});

	return (
		<group
			ref={row}
			position={[0, y, 0]}
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
				e.stopPropagation();
				onSelect(site.slug);
			}}>
			<HoloPanel width={width} height={ROW * 0.86} edge={selected || leader ? t.amber : t.blue} glow={active ? 1.4 : 0.6} opacity={active ? 0.6 : 0.42} />
			{portrait ? (
				<T font="display" fontSize={0.21} color={active ? t.amberText : t.text} anchorX="left" position={[-3.35, 0.14, 0.02]}>
					{`${String(rank).padStart(2, "0")}  ${site.name}`}
				</T>
			) : (
				<>
					<T font="mono" fontSize={0.22} color={leader ? t.amber : t.blueText} anchorX="left" position={[-6.45, 0, 0.02]}>
						{String(rank).padStart(2, "0")}
					</T>
					<T font="display" fontSize={0.24} color={active ? t.amberText : t.text} anchorX="left" position={[-5.75, 0, 0.02]}>
						{site.name}
					</T>
				</>
			)}
			<mesh ref={bar} position={[barX0, portrait ? -0.13 : 0, 0.03]} scale={[0.04, 1, 1]}>
				<boxGeometry args={[1, portrait ? 0.1 : 0.16, 0.05]} />
				<meshBasicMaterial color={leader || selected ? t.amber : t.blue} toneMapped={false} />
			</mesh>
			<T
				font="mono"
				fontSize={0.15}
				letterSpacing={0.08}
				color={leader || selected ? t.amberText : t.textSoft}
				anchorX="right"
				position={[width / 2 - 0.25, portrait ? 0.14 : 0, 0.02]}>
				{countLabel(count)}
			</T>
		</group>
	);
}

export function BoardStation({ portrait, sites, counts, selected, hovered, onHover, onSelect, flash, progress }) {
	const t = usePalette();
	const z = Z[2];
	const rack = useRef(null);
	useArrival(rack, progress, 2, (o, w) => {
		const k = easeOut(w * 1.4);
		o.rotation.y = (1 - k) * 0.9 + (portrait ? 0 : -0.06);
		o.rotation.x = (1 - k) * 0.4;
	});
	const ranked = sites
		.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 }))
		.sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));

	return (
		<group position={[0, 0, z]}>
			<group ref={rack}>
				<T font="mono" fontSize={0.16} letterSpacing={0.3} color={t.blueText} position={[0, 10.35, 0]}>
					LIVE · RANKED BY PRE-ORDERS
				</T>
				<T font="display" fontSize={portrait ? 0.5 : 0.6} letterSpacing={-0.02} color={t.text} position={[0, 9.75, 0]}>
					THE MOST WANTED
				</T>
				{ranked.map((r, rank) => (
					<RackRow
						key={r.site.slug}
						site={r.site}
						rank={rank + 1}
						count={counts ? r.n : null}
						max={max}
						portrait={portrait}
						selected={selected === r.site.slug}
						hovered={hovered === r.site.slug}
						onHover={onHover}
						onSelect={onSelect}
						flash={flash?.slug === r.site.slug ? flash.at : 0}
					/>
				))}
				<T font="mono" fontSize={0.14} letterSpacing={0.22} color={t.textMuted} position={[0, 0.25, 0]}>
					TAP A SITE TO PRE-ORDER IT · NOT LISTED? SUGGEST ONE IN THE FORM
				</T>
			</group>
			<HoloRings radius={portrait ? 3.6 : 7} position={[0, 0.02, 0.5]} />
		</group>
	);
}

/* ───────────────────────── 03 · Form ───────────────────────── */

export function FormStation({ portrait, visible, sites, selected, onSelect, onDone }) {
	const t = usePalette();
	const z = Z[3];
	const ring = useRef(null);
	const site = sites.find((s) => s.slug === selected);
	useFrame((state) => {
		if (ring.current) ring.current.rotation.z = state.clock.elapsedTime * 0.15;
	});
	return (
		<group position={[0, 0, z]}>
			<group ref={ring} position={[0, 4.4, -1.2]}>
				<mesh>
					<torusGeometry args={[portrait ? 3.6 : 5.6, 0.025, 8, 200]} />
					<meshBasicMaterial color={t.blue} toneMapped={false} />
				</mesh>
				<mesh>
					<torusGeometry args={[portrait ? 3.9 : 6, 0.05, 6, 80, Math.PI * 0.5]} />
					<meshBasicMaterial color={t.amber} toneMapped={false} />
				</mesh>
			</group>
			<T font="mono" fontSize={0.17} letterSpacing={0.3} color={t.blueText} position={[0, 9.75, 0]}>
				TARGET LOCKED
			</T>
			<T font="display" fontSize={0.4} color={t.amber} maxWidth={8} textAlign="center" position={[0, 9.25, 0]}>
				{site ? site.name.toUpperCase() : "YOUR SUGGESTION"}
			</T>
			<HoloRings radius={portrait ? 2.6 : 4} position={[0, 0.02, 0]} />
			<Html
				transform
				distanceFactor={6}
				position={[0, 4.4, 0]}
				zIndexRange={[20, 0]}
				style={{
					opacity: visible ? 1 : 0,
					pointerEvents: visible ? "auto" : "none",
					transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1)",
				}}>
				<FormPanel sites={sites} selected={selected} onSelect={onSelect} onDone={onDone} narrow={portrait} />
			</Html>
		</group>
	);
}

/* ───────────────────────── 04 · Get the app ───────────────────────── */

function Link3D({ children, href, position }) {
	const t = usePalette();
	return (
		<T
			font="mono"
			fontSize={0.16}
			letterSpacing={0.24}
			color={t.textSoft}
			position={position}
			onClick={() => {
				window.location.href = href;
			}}
			onPointerOver={() => setCursor("pointer")}
			onPointerOut={() => setCursor("")}>
			{children}
		</T>
	);
}

/** A holographic phone: outline, screen glass, a mini scan running on it. */
function HoloPhone(props) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame((state) => {
		if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.35;
	});
	return (
		<group ref={ref} {...props}>
			<HoloPanel width={2.4} height={4.8} edge={t.blue} glow={1.2} opacity={0.5} />
			<mesh position={[0, 2.15, 0.02]}>
				<boxGeometry args={[0.6, 0.06, 0.02]} />
				<meshBasicMaterial color={t.blueText} toneMapped={false} />
			</mesh>
			<KonarkScan scale={0.95} position={[0, -0.1, 0.1]} size={10} />
			<T font="mono" fontSize={0.12} letterSpacing={0.2} color={t.amberText} position={[0, -1.85, 0.05]}>
				AR VIEW
			</T>
		</group>
	);
}

export function AppStation({ portrait }) {
	const t = usePalette();
	const z = Z[4];
	const button = useRef(null);
	const hover = useRef(false);
	useFrame((_, delta) => {
		const b = button.current;
		if (b) b.scale.setScalar(THREE.MathUtils.damp(b.scale.x, hover.current ? 1.06 : 1, 8, delta));
	});
	return (
		<group position={[0, 0, z]}>
			<HoloPhone position={portrait ? [0, 7.4, -0.5] : [4.3, 3.7, -0.5]} scale={portrait ? 0.7 : 1} />
			<group position={portrait ? [0, 0.4, 0] : [-2.2, 0, 0]} scale={portrait ? 0.68 : 1}>
				<T font="mono" fontSize={0.18} letterSpacing={0.3} color={t.blueText} position={[0, 6.4, 0]}>
					WHILE YOU WAIT
				</T>
				<T font="display" fontSize={0.95} letterSpacing={-0.03} color={t.text} position={[0, 5.55, 0]}>
					SEE IT FIRST.
				</T>
				<T fontSize={0.24} color={t.textSoft} maxWidth={7.4} textAlign="center" lineHeight={1.45} position={[0, 4.45, 0]}>
					Epocheye is live today at four monuments in Bengaluru and Kolkata. Get the app while your site is being built.
				</T>
				<group
					ref={button}
					position={[0, 3.2, 0.1]}
					onClick={() => window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")}
					onPointerOver={() => {
						hover.current = true;
						setCursor("pointer");
					}}
					onPointerOut={() => {
						hover.current = false;
						setCursor("");
					}}>
					<mesh>
						<boxGeometry args={[5, 0.86, 0.12]} />
						<meshBasicMaterial color={t.blue} toneMapped={false} />
					</mesh>
					<T font="mono" fontSize={0.21} letterSpacing={0.16} color="#ffffff" position={[0, 0, 0.08]}>
						GET EPOCHEYE ON GOOGLE PLAY
					</T>
				</group>
				<group position={[0, 2.1, 0]}>
					<Link3D href="/" position={[-2.1, 0, 0]}>
						HOME
					</Link3D>
					<Link3D href="/monuments" position={[-0.7, 0, 0]}>
						MONUMENTS
					</Link3D>
					<Link3D href="/privacy" position={[0.85, 0, 0]}>
						PRIVACY
					</Link3D>
					<Link3D href="/terms" position={[2.15, 0, 0]}>
						TERMS
					</Link3D>
				</group>
				<T font="mono" fontSize={0.13} letterSpacing={0.24} color={t.textMuted} position={[0, 1.6, 0]}>
					© EPOCHEYE PRIVATE LIMITED
				</T>
			</group>
		</group>
	);
}
