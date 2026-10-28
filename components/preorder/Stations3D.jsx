"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Edges, Float, Html, Text } from "@react-three/drei";

import { PLAY_STORE_URL } from "@/lib/site";
import { COLORS, FONTS } from "./theme";
import { STATIONS, stationWeight } from "./stations";
import { Iris } from "./Field";
import FormPanel from "./FormPanel";

const Z = STATIONS.map((s) => s.look[2]);
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);

function T({ font = "body", children, ...props }) {
	return (
		<Text font={FONTS[font]} anchorX="center" anchorY="middle" material-toneMapped={false} {...props}>
			{children}
		</Text>
	);
}

/** Calls apply(object, weight) every frame with how close the camera is to station i. */
function useReveal(ref, progress, i, apply) {
	useFrame((_, delta) => {
		const o = ref.current;
		if (!o) return;
		apply(o, stationWeight(progress.get(), i), delta);
	});
}

/** Soft dark oval behind text that sits over the bright grid. */
function Scrim({ width, height, position, opacity = 0.75 }) {
	return (
		<mesh position={position} renderOrder={-1}>
			<planeGeometry args={[width, height]} />
			<shaderMaterial
				transparent
				depthWrite={false}
				uniforms={{ uColor: { value: new THREE.Color(COLORS.ink) }, uOpacity: { value: opacity } }}
				vertexShader="varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }"
				fragmentShader="uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; void main() { float d = length((vUv - 0.5) * 2.0); gl_FragColor = vec4(uColor, (1.0 - smoothstep(0.3, 1.0, d)) * uOpacity); }"
			/>
		</mesh>
	);
}

const setCursor = (v) => {
	document.body.style.cursor = v;
};

/* ───────────────────────── 0 · Hero ───────────────────────── */

export function HeroStation({ portrait, introDelay }) {
	const group = useRef(null);
	useFrame((state) => {
		const g = group.current;
		if (!g) return;
		// Rise out of the grid once the curtain lifts.
		const k = easeOut((state.clock.elapsedTime - introDelay) / 1.8);
		g.position.y = 4.7 - (1 - k) * 6;
		g.rotation.x = -0.25 - (1 - k) * 0.7;
	});
	const s = portrait ? 0.66 : 1;
	return (
		<>
			<Iris position={[0, portrait ? 9.4 : 8.4, -3]} scale={0.85} />
			<group ref={group} position={[0, -2, 2]} scale={s}>
				<Scrim width={16} height={6.5} position={[0, -0.6, -0.3]} />
				<T font="display" fontSize={1.08} letterSpacing={-0.04} color={COLORS.bone} position={[0, 0.85, 0]}>
					PRE-ORDER
				</T>
				<T font="serif" fontSize={1.4} color={COLORS.lime} position={[0.7, -0.35, 0.2]}>
					the past.
				</T>
				<T
					font="mono"
					fontSize={portrait ? 0.3 : 0.22}
					letterSpacing={0.16}
					lineHeight={1.6}
					color={COLORS.violetLight}
					position={[0, portrait ? -1.85 : -1.55, 0]}
					maxWidth={portrait ? 8.6 : 11}
					textAlign="center">
					PICK THE HERITAGE SITE YOU WANT TO SEE NEXT. THE MOST-WANTED GETS BUILT FIRST.
				</T>
				<T font="mono" fontSize={portrait ? 0.22 : 0.17} letterSpacing={0.3} color={COLORS.lime} position={[0, portrait ? -3.05 : -2.45, 0]}>
					SCROLL TO ENTER THE GRID
				</T>
			</group>
		</>
	);
}

/* ─────────────────────── 1 · How it works ─────────────────────── */

const STEPS = [
	["01", "Pick a site", "Choose a heritage site that isn't in Epocheye yet, or suggest your own."],
	["02", "Pre-order it", "Leave your name and email. There is nothing to pay today."],
	["03", "Most-wanted goes first", "The sites with the most pre-orders get built first. When yours is ready, you see it first."],
];

function StepPanel({ index, n, title, body, position, rotationY, progress, reduced }) {
	const ref = useRef(null);
	useReveal(ref, progress, 1, (o, w) => {
		const k = easeOut(w * 1.4 - index * 0.15);
		o.rotation.x = (1 - k) * 1.1;
		o.position.y = position[1] - (1 - k) * 2.5;
		o.scale.setScalar(0.7 + k * 0.3);
	});
	return (
		<group ref={ref} position={position} rotation-y={rotationY}>
			<Float enabled={!reduced} speed={1.4} rotationIntensity={0.12} floatIntensity={0.35}>
				<mesh>
					<boxGeometry args={[4.6, 3.3, 0.14]} />
					<meshBasicMaterial color={COLORS.inkSoft} transparent opacity={0.88} />
					<Edges color={COLORS.violet} />
				</mesh>
				<mesh position={[-1.85, 1.62, 0.08]}>
					<boxGeometry args={[0.9, 0.06, 0.02]} />
					<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
				</mesh>
				<group position={[-1.95, 0, 0.1]}>
					<T font="mono" fontSize={0.34} color={COLORS.lime} anchorX="left" position={[0, 1.1, 0]}>
						{n}
					</T>
					<T font="display" fontSize={0.34} color={COLORS.bone} anchorX="left" anchorY="top" maxWidth={3.9} position={[0, 0.62, 0]}>
						{title}
					</T>
					<T
						fontSize={0.2}
						color="#cfc6ea"
						anchorX="left"
						anchorY="top"
						maxWidth={3.9}
						lineHeight={1.45}
						position={[0, title.length > 16 ? -0.3 : -0.05, 0]}>
						{body}
					</T>
				</group>
			</Float>
		</group>
	);
}

export function HowStation({ portrait, progress, reduced }) {
	const z = Z[1];
	const y = portrait ? STATIONS[1].lookPortrait[1] : STATIONS[1].look[1];
	const layout = portrait
		? STEPS.map((_, i) => ({ position: [0, y + (1 - i) * 3.65, z], rotationY: 0 }))
		: STEPS.map((_, i) => ({ position: [(i - 1) * 5.1, y, z], rotationY: (1 - i) * 0.22 }));
	return (
		<group>
			{/* On tall screens the HUD already names the section; the heading would crowd the top. */}
			{!portrait && (
				<T font="mono" fontSize={0.26} letterSpacing={0.3} color={COLORS.violetLight} position={[0, y + 2.6, z]}>
					HOW IT WORKS
				</T>
			)}
			{STEPS.map(([n, title, body], i) => (
				<StepPanel
					key={n}
					index={i}
					n={n}
					title={title}
					body={body}
					progress={progress}
					reduced={reduced}
					{...layout[i]}
				/>
			))}
		</group>
	);
}

/* ─────────────────────── 2 · Leaderboard ─────────────────────── */

// The leaderboard is a ranked 3D bar board: one extruded bar per site, length
// by pre-orders. Rows glide to their new rank when the counts change.
const ROW_GAP = 0.6;
const ROW_GAP_PORTRAIT = 0.74;
const TOP_ROW = 7.5;
const TOP_ROW_PORTRAIT = 8.7;

function BoardRow({ site, rank, count, max, portrait, selected, hovered, onHover, onSelect, flash }) {
	const row = useRef(null);
	const bar = useRef(null);
	const cap = useRef(null);
	const num = useRef(null);
	const gap = portrait ? ROW_GAP_PORTRAIT : ROW_GAP;
	const y = (portrait ? TOP_ROW_PORTRAIT : TOP_ROW) - (rank - 1) * gap;
	const x0 = portrait ? -3.4 : -1.2; // where bars start
	const maxLen = portrait ? 5.6 : 6.6;
	const len = 0.18 + maxLen * (max > 0 ? (count ?? 0) / max : 0);
	const active = selected || hovered;
	const leader = rank === 1 && count > 0;

	useFrame((_, delta) => {
		const r = row.current;
		if (!r) return;
		r.position.y = THREE.MathUtils.damp(r.position.y, y, 5, delta);
		r.position.z = THREE.MathUtils.damp(r.position.z, active ? 0.45 : 0, 8, delta);
		const l = THREE.MathUtils.damp(bar.current.scale.x, len, 3, delta);
		bar.current.scale.x = l;
		bar.current.position.x = x0 + l / 2;
		const pulse = flash ? Math.max(0, 1 - (performance.now() - flash) / 1600) : 0;
		cap.current.position.x = x0 + l;
		cap.current.scale.setScalar(1 + pulse * 1.5);
		num.current.position.x = x0 + l + 0.35;
	});

	const barColor = leader ? "#9dc400" : active ? "#6a2ff0" : "#3b1891";
	return (
		<group ref={row} position={[0, y, 0]}>
			{/* Hit area: the whole row is clickable. */}
			<mesh
				position={[portrait ? 0 : -0.3, portrait ? 0.08 : 0, 0.3]}
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
				<planeGeometry args={portrait ? [7.6, gap * 0.98] : [15, gap * 0.96]} />
				<meshBasicMaterial transparent opacity={0} depthWrite={false} />
			</mesh>
			<mesh position={[portrait ? 0 : -0.3, portrait ? 0.08 : 0, -0.05]} visible={active}>
				<planeGeometry args={portrait ? [7.6, gap * 0.94] : [15, gap * 0.9]} />
				<meshBasicMaterial color={selected ? COLORS.lime : COLORS.violet} transparent opacity={0.07} depthWrite={false} />
			</mesh>
			{portrait ? (
				<T font="display" fontSize={0.26} color={COLORS.bone} anchorX="left" position={[-3.4, 0.26, 0.1]}>
					{`${rank}. ${site.name}`}
				</T>
			) : (
				<>
					<T font="mono" fontSize={0.22} color={leader ? COLORS.lime : COLORS.violetLight} anchorX="left" position={[-7.4, 0, 0.1]}>
						{String(rank).padStart(2, "0")}
					</T>
					<T font="display" fontSize={0.27} color={active ? COLORS.lime : COLORS.bone} anchorX="left" position={[-6.75, 0.02, 0.1]}>
						{site.name}
					</T>
				</>
			)}
			<mesh ref={bar} position={[x0, portrait ? -0.14 : 0, 0]} scale={[0.18, 1, 1]}>
				<boxGeometry args={[1, portrait ? 0.26 : 0.36, 0.42]} />
				<meshBasicMaterial color={barColor} toneMapped={!leader} />
				<Edges color={leader ? COLORS.lime : COLORS.violetLight} />
			</mesh>
			<mesh ref={cap} position={[x0, portrait ? -0.14 : 0, 0]}>
				<boxGeometry args={[0.07, portrait ? 0.3 : 0.42, 0.48]} />
				<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
			</mesh>
			<group ref={num} position={[x0, portrait ? -0.14 : 0, 0.1]}>
				<T font="mono" fontSize={0.22} color={leader || selected ? COLORS.lime : "#cfc6ea"} anchorX="left">
					{count == null ? "…" : String(count)}
				</T>
			</group>
		</group>
	);
}

export function BoardStation({ portrait, sites, counts, selected, hovered, onHover, onSelect, flash }) {
	const z = Z[2];
	const ranked = sites
		.map((s, i) => ({ site: s, i, n: counts?.[s.slug] ?? 0 }))
		.sort((a, b) => b.n - a.n || a.i - b.i);
	const max = Math.max(0, ...ranked.map((r) => r.n));
	const top = portrait ? 10 : 8.95;

	return (
		<group position={[0, 0, z]}>
			<T font="display" fontSize={portrait ? 0.5 : 0.62} letterSpacing={-0.02} color={COLORS.bone} position={[0, top, 0]}>
				THE MOST WANTED
			</T>
			<T font="mono" fontSize={portrait ? 0.2 : 0.17} letterSpacing={0.24} color={COLORS.lime} position={[0, top - 0.5, 0]}>
				{counts ? "TAP A SITE TO PRE-ORDER IT" : "LOADING THE LEADERBOARD"}
			</T>
			{!portrait && (
				<group position={[0, TOP_ROW + 0.45, 0]}>
					<T font="mono" fontSize={0.13} letterSpacing={0.24} color="#8b7fb0" anchorX="left" position={[-7.4, 0, 0]}>
						RANK
					</T>
					<T font="mono" fontSize={0.13} letterSpacing={0.24} color="#8b7fb0" anchorX="left" position={[-6.75, 0, 0]}>
						SITE
					</T>
					<T font="mono" fontSize={0.13} letterSpacing={0.24} color="#8b7fb0" anchorX="left" position={[-1.2, 0, 0]}>
						PRE-ORDERS
					</T>
				</group>
			)}
			{/* Backboard */}
			<mesh position={[0, portrait ? 5.3 : 4.95, -0.4]}>
				<planeGeometry args={portrait ? [8.2, 10.9] : [16.4, 9.4]} />
				<meshBasicMaterial color={COLORS.inkSoft} transparent opacity={0.82} />
				<Edges color={COLORS.violet} />
			</mesh>
			{ranked.map((r, rank) => (
				<BoardRow
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
			<T font="mono" fontSize={0.15} letterSpacing={0.22} color="#8b7fb0" position={[0, portrait ? 0.05 : 0.35, 0]}>
				NOT ON THE LIST? SUGGEST ONE IN THE FORM
			</T>
		</group>
	);
}

/* ───────────────────────── 3 · Form ───────────────────────── */

export function FormStation({ portrait, visible, sites, selected, onSelect, onDone }) {
	const z = Z[3];
	const y = STATIONS[3].look[1];
	const site = sites.find((s) => s.slug === selected);
	return (
		<group>
			{!portrait && (
				<group position={[-4.7, 0, z]}>
					<mesh position={[0, 2.4, 0]}>
						<boxGeometry args={[2.2, 4.8, 2.2]} />
						<meshBasicMaterial color="#2d1170" />
						<Edges color={COLORS.violetLight} />
					</mesh>
					<mesh position={[0, 4.84, 0]}>
						<boxGeometry args={[2.2, 0.1, 2.2]} />
						<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
					</mesh>
					<T font="mono" fontSize={0.2} letterSpacing={0.24} color={COLORS.violetLight} position={[0, 6.55, 0]}>
						YOUR PICK
					</T>
					<T font="display" fontSize={0.42} color={COLORS.bone} maxWidth={4.2} textAlign="center" position={[0, 5.85, 0]}>
						{site ? site.name : "Another site"}
					</T>
				</group>
			)}
			<Html
				transform
				distanceFactor={6}
				position={[portrait ? 0 : 2.4, y, z]}
				rotation-y={portrait ? 0 : -0.12}
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

/* ───────────────────────── 4 · Get the app ───────────────────────── */

function Link3D({ children, href, position }) {
	return (
		<T
			font="mono"
			fontSize={0.17}
			letterSpacing={0.24}
			color="#d9d2f0"
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

export function AppStation({ portrait }) {
	const z = Z[4];
	const button = useRef(null);
	const hover = useRef(false);
	useFrame((_, delta) => {
		const b = button.current;
		if (!b) return;
		const s = THREE.MathUtils.damp(b.scale.x, hover.current ? 1.07 : 1, 8, delta);
		b.scale.setScalar(s);
	});
	return (
		<group position={[0, 0, z]} scale={portrait ? 0.78 : 1}>
			<Iris position={[0, 7.2, -2]} scale={0.8} />
			<T font="display" fontSize={1.25} letterSpacing={-0.03} color={COLORS.bone} position={[-1.2, 5, 0]}>
				SEE IT
			</T>
			<T font="serif" fontSize={1.55} color={COLORS.lime} position={[2.6, 4.9, 0.1]}>
				first.
			</T>
			<T fontSize={0.26} color="#cfc6ea" maxWidth={9} textAlign="center" lineHeight={1.4} position={[0, 3.65, 0]}>
				Epocheye is live today at four monuments in Bengaluru and Kolkata. Get the app while your site is being built.
			</T>
			<group
				ref={button}
				position={[0, 2.35, 0]}
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
					<boxGeometry args={[5.4, 0.95, 0.24]} />
					<meshBasicMaterial color={COLORS.inkSoft} />
					<Edges color={COLORS.lime} />
				</mesh>
				<mesh position={[0, -0.5, 0]}>
					<boxGeometry args={[5.4, 0.04, 0.26]} />
					<meshBasicMaterial color={COLORS.lime} toneMapped={false} />
				</mesh>
				<T font="mono" fontSize={0.24} letterSpacing={0.16} color={COLORS.lime} position={[0, 0, 0.14]}>
					GET EPOCHEYE ON GOOGLE PLAY
				</T>
			</group>
			<group position={[0, 1.1, 0]}>
				<Link3D href="/" position={[-2.2, 0, 0]}>
					HOME
				</Link3D>
				<Link3D href="/monuments" position={[-0.75, 0, 0]}>
					MONUMENTS
				</Link3D>
				<Link3D href="/privacy" position={[0.85, 0, 0]}>
					PRIVACY
				</Link3D>
				<Link3D href="/terms" position={[2.2, 0, 0]}>
					TERMS
				</Link3D>
			</group>
			<T font="mono" fontSize={0.14} letterSpacing={0.24} color="#9a90bd" position={[0, 0.6, 0]}>
				© EPOCHEYE PRIVATE LIMITED
			</T>
		</group>
	);
}
