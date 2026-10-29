"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox, useTexture } from "@react-three/drei";

import { REFUND_BY } from "@/lib/preorder/promise";
import { PLAY_STORE_URL } from "@/lib/site";
import { usePalette } from "./theme";
import { STATIONS, stationWeight } from "./stations";
import { Gate, HoloRings, KonarkScan } from "./Holo";
import { Extruded, T, easeOut, setCursor } from "./ui3d";

const Z = STATIONS.map((s) => s.look[2]);
const sideOf = (t) => (t.mode === "light" ? "#d6b79c" : "#3d2b22");

export function Gates() {
	return STATIONS.slice(1).map((s) => <Gate key={s.id} z={s.look[2] + 16} />);
}

/* ───────────────────────── 00 · Hero ───────────────────────── */

/** "Step inside": nudges the camera on to the next station; the visitor scrolls from there. */
function HeroEnter({ portrait, active, priceLabel, onEnter }) {
	return (
		<Html
			position={[0, portrait ? -2.75 : -1.75, 0]}
			zIndexRange={[30, 0]}
			style={{
				opacity: active ? 1 : 0,
				pointerEvents: active ? "auto" : "none",
				transition: "opacity 0.4s",
			}}>
			{/* drei owns the wrapper's transform; centre on phones from inside it. */}
			<div className={`flex w-max flex-col gap-2.5 ${portrait ? "-translate-x-1/2 items-center text-center" : "items-start"}`}>
				<button
					type="button"
					onClick={onEnter}
					tabIndex={active ? 0 : -1}
					className="group relative h-14 overflow-hidden rounded-full border border-white/35 bg-(--pa-accent)/85 px-8 font-(family-name:--font-pre-display) text-[19px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_12px_40px_-10px_var(--pa-accent-glow),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03]">
					{/* Glass sheen across the top half. */}
					<span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/25 to-transparent" />
					<span className="relative">Step inside ↓</span>
				</button>
				<span className="font-(family-name:--font-pre-display) text-[14px] font-medium text-(--pa-text-soft)">
					{`Pre-order${priceLabel ? ` for ${priceLabel}` : ""} · full refund if your site isn't live by ${REFUND_BY}.`}
				</span>
			</div>
		</Html>
	);
}

export function HeroStation({ portrait, progress, intro, active, priceLabel, onEnter }) {
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
		g.position.y = (portrait ? 0.9 : 3.5) - (1 - k) * 1.2;
		g.rotation.x = (1 - k) * -0.6;
	});
	const cloud = portrait ? { position: [0, 5.2, -1], scale: 3.1 } : { position: [4.3, 2.3, -1.5], scale: 3.7 };
	const s = portrait ? 0.62 : 1;
	return (
		<>
			<group ref={scan}>
				<KonarkScan assemble={assemble} interactive position={cloud.position} scale={cloud.scale} size={portrait ? 16 : 19} />
			</group>
			<HoloRings radius={portrait ? 2.4 : 3.4} position={[cloud.position[0], portrait ? 4.4 : 0.02, cloud.position[2]]} />
			<T font="mono" fontSize={0.15} letterSpacing={0.22} color={t.accentText} position={[cloud.position[0], portrait ? 7.8 : 5.4, cloud.position[2]]}>
				KONARK SUN TEMPLE · MOVE YOUR POINTER THROUGH IT
			</T>
			<group ref={title} position={[portrait ? 0 : -6.9, 3.5, 0.5]} scale={s}>
				<T font="mono" fontSize={0.2} letterSpacing={0.3} color={t.accentText} anchorX={portrait ? "center" : "left"} position={[0, 2.05, 0]}>
					EPOCHEYE · PRE-ORDER
				</T>
				<Extruded color={t.text} side={sideOf(t)} fontSize={0.95} letterSpacing={-0.02} anchorX={portrait ? "center" : "left"} position={[0, 1.15, 0]}>
					PRE-ORDER
				</Extruded>
				<Extruded color={t.accent} side={sideOf(t)} fontSize={0.95} letterSpacing={-0.02} anchorX={portrait ? "center" : "left"} position={[0, 0.1, 0]}>
					THE PAST.
				</Extruded>
				<T
					fontSize={portrait ? 0.36 : 0.22}
					lineHeight={1.45}
					color={t.textSoft}
					anchorX={portrait ? "center" : "left"}
					anchorY="top"
					textAlign={portrait ? "center" : "left"}
					maxWidth={portrait ? 9 : 6.4}
					position={[0, -0.7, 0]}>
					Pick the heritage site you want in Epocheye next. Every pre-order lays a brick, and the tallest tower goes live
					for Diwali.
				</T>
				<HeroEnter portrait={portrait} active={active} priceLabel={priceLabel} onEnter={onEnter} />
			</group>
		</>
	);
}

/* ─────────────────────── 01 · How it works ─────────────────────── */

const WORDS = [
	["PICK.", "A heritage site that isn't in Epocheye yet, or your own."],
	["PRE-ORDER.", "Your name on a ticket, then stamp it to pay. Full refund if your site isn't live by 31 Dec 2026."],
	["SEE IT FIRST.", "The tallest tower goes live for Diwali, and you're the first in."],
];

function KineticWord({ index, word, line, position, progress, portrait, last }) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame(() => {
		const o = ref.current;
		if (!o) return;
		// Each word flips up out of the floor in turn as the camera arrives.
		const k = easeOut(stationWeight(progress.get(), 1) * 1.6 - index * 0.22);
		o.rotation.x = (1 - k) * -1.4;
		o.position.y = position[1] - (1 - k) * 1.5;
	});
	const anchor = portrait ? "center" : "left";
	return (
		<group ref={ref} position={position}>
			<Extruded color={last ? t.accent : t.text} side={sideOf(t)} fontSize={portrait ? 0.9 : 1.15} letterSpacing={-0.02} anchorX={anchor} anchorY="bottom" position={[0, 0, 0]}>
				{word}
			</Extruded>
			<T font="mono" fontSize={portrait ? 0.2 : 0.17} letterSpacing={0.08} color={t.textSoft} anchorX={anchor} anchorY="top" maxWidth={portrait ? 5.4 : 6} textAlign={anchor} position={[0, -0.12, 0]}>
				{`${String(index + 1).padStart(2, "0")} — ${line}`}
			</T>
		</group>
	);
}

export function HowStation({ portrait, progress }) {
	const z = Z[1];
	const layout = portrait
		? WORDS.map((_, i) => [0, 9.6 - i * 3.2, z])
		: WORDS.map((_, i) => [-7.4 + i * 3.1, 6.0 - i * 2.35, z - i * 0.8]);
	return WORDS.map(([word, line], i) => (
		<KineticWord key={word} index={i} word={word} line={line} position={layout[i]} progress={progress} portrait={portrait} last={i === WORDS.length - 1} />
	));
}

/* ───────────────────────── 04 · Get the app ───────────────────────── */

function PlayBadge(props) {
	const texture = useTexture("/google-play-badge.png");
	const ref = useRef(null);
	const hover = useRef(false);
	useFrame((state, delta) => {
		const g = ref.current;
		if (!g) return;
		g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.35, 4, delta);
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.25, 4, delta);
		g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, hover.current ? 1.08 : 1, 8, delta));
	});
	// The official badge artwork, 646 × 250.
	const w = 4.2;
	const h = (w * 250) / 646;
	return (
		<group
			ref={ref}
			{...props}
			onClick={() => window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer")}
			onPointerOver={() => {
				hover.current = true;
				setCursor("pointer");
			}}
			onPointerOut={() => {
				hover.current = false;
				setCursor("");
			}}>
			<RoundedBox args={[w + 0.12, h + 0.12, 0.16]} radius={0.12} smoothness={4} position-z={-0.09}>
				<meshStandardMaterial color="#000000" roughness={0.4} metalness={0.2} />
			</RoundedBox>
			<mesh>
				<planeGeometry args={[w, h]} />
				<meshBasicMaterial map={texture} toneMapped={false} transparent />
			</mesh>
		</group>
	);
}

function Phone(props) {
	const t = usePalette();
	const ref = useRef(null);
	useFrame((state) => {
		if (ref.current) ref.current.rotation.y = -0.35 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
	});
	return (
		<group ref={ref} {...props}>
			<RoundedBox args={[2.5, 5, 0.22]} radius={0.28} smoothness={6}>
				<meshStandardMaterial color="#2a1c15" roughness={0.35} metalness={0.3} />
			</RoundedBox>
			<mesh position-z={0.115}>
				<planeGeometry args={[2.25, 4.7]} />
				<meshBasicMaterial color={t.mode === "light" ? "#1a120e" : "#0e0907"} />
			</mesh>
			<mesh position={[0, 2.18, 0.12]}>
				<boxGeometry args={[0.55, 0.08, 0.01]} />
				<meshBasicMaterial color="#3d2b22" />
			</mesh>
			<KonarkScan scale={1} position={[0, 0.1, 0.4]} size={9} />
			<T font="mono" fontSize={0.12} letterSpacing={0.2} color="#f0bf63" position={[0, -1.85, 0.13]}>
				LIVE IN AR
			</T>
		</group>
	);
}

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

export function AppStation({ portrait }) {
	const t = usePalette();
	const z = Z[4];
	return (
		<group position={[0, 0, z]}>
			<Phone position={portrait ? [0, 7.5, -0.5] : [4.4, 3.6, -0.5]} scale={portrait ? 0.62 : 1} />
			<group position={portrait ? [0, 0.6, 0] : [-2.4, 0, 0]} scale={portrait ? 0.7 : 1}>
				<T font="mono" fontSize={0.18} letterSpacing={0.3} color={t.accentText} position={[0, 6.55, 0]}>
					WHILE YOUR SITE IS BUILT
				</T>
				<Extruded color={t.text} side={sideOf(t)} fontSize={0.9} letterSpacing={-0.02} position={[0, 5.7, 0]}>
					GET EPOCHEYE
				</Extruded>
				<T fontSize={0.24} color={t.textSoft} maxWidth={7.4} textAlign="center" lineHeight={1.45} position={[0, 4.65, 0]}>
					Live today at four monuments in Bengaluru and Kolkata.
				</T>
				<PlayBadge position={[0, 3.3, 0.2]} />
				<group position={[0, 1.95, 0]}>
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
				<T font="mono" fontSize={0.13} letterSpacing={0.24} color={t.textMuted} position={[0, 1.45, 0]}>
					© EPOCHEYE PRIVATE LIMITED
				</T>
			</group>
		</group>
	);
}
