"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useVideoTexture } from "@react-three/drei";

import { IMG } from "@/components/fx/heritageImages";
import { PALETTE as P } from "./theme";
import { STATION_INDEX, stationWeight, stationZ } from "./stations";
import { Arrive, Extruded, Hoverable, Label, Photo, T, easeOut, setCursor } from "./kit";

// Textures load at 900px wide: plenty for a slab a few units across.
const small = (src) => src.replace("w=1600", "w=900");

/* ───────────────────────── 02 · The stack ───────────────────────── */

const BLOCKS = [
	{
		n: "01",
		title: "AR Time Travel",
		desc: "Stand at the monument and see what the record says was there: Tipu Sultan's Summer Palace as it was painted, Bangalore Fort's lost rampart back on its wall.",
		src: small(IMG.pyramids),
		caption: "PYRAMIDS OF GIZA · EGYPT",
	},
	{
		n: "02",
		title: "AI Historian",
		desc: "A guided narration at Tipu Sultan's Summer Palace, in English and Hindi, stop by stop as you walk the rooms.",
		src: small(IMG.boudhanath),
		caption: "BOUDHANATH STUPA · NEPAL",
	},
	{
		n: "03",
		title: "Sourced, every card",
		desc: "Point at an exhibit and read what the published record says, with the source named. Where no record exists, the app says so.",
		src: "/img7.webp",
		caption: "BAGAN · MYANMAR",
	},
];

/** AR: a wireframe relic that solidifies and dissolves, past into present. */
function RelicEmblem() {
	const ref = useRef(null);
	const solid = useRef(null);
	useFrame((state, delta) => {
		if (ref.current) ref.current.rotation.y += delta * 0.6;
		if (solid.current) solid.current.material.opacity = 0.35 + 0.35 * Math.sin(state.clock.elapsedTime * 1.3);
	});
	return (
		<group ref={ref}>
			<mesh>
				<icosahedronGeometry args={[0.55, 1]} />
				<meshBasicMaterial color={P.accent} wireframe toneMapped={false} />
			</mesh>
			<mesh ref={solid} scale={0.98}>
				<icosahedronGeometry args={[0.55, 1]} />
				<meshStandardMaterial color={P.text} transparent opacity={0.4} flatShading />
			</mesh>
		</group>
	);
}

/** AI Historian: a voice, as bars that rise and fall. */
function VoiceEmblem() {
	const bars = useRef([]);
	useFrame((state) => {
		const t = state.clock.elapsedTime;
		bars.current.forEach((b, i) => {
			if (b) b.scale.y = 0.25 + Math.abs(Math.sin(t * 3 + i * 0.7) * Math.cos(t * 1.3 + i * 0.3));
		});
	});
	return (
		<group>
			{Array.from({ length: 11 }, (_, i) => (
				<mesh
					key={i}
					ref={(el) => {
						bars.current[i] = el;
					}}
					position={[(i - 5) * 0.11, 0, 0]}>
					<boxGeometry args={[0.06, 1.1, 0.06]} />
					<meshBasicMaterial color={i === 5 ? P.accent : P.text} toneMapped={false} />
				</mesh>
			))}
		</group>
	);
}

/** Sourced: record cards fanning open. */
function CardsEmblem() {
	const cards = useRef([]);
	useFrame((state) => {
		const k = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.1);
		cards.current.forEach((c, i) => {
			if (c) c.rotation.z = (i - 1) * 0.35 * k;
		});
	});
	return (
		<group>
			{[0, 1, 2].map((i) => (
				<group
					key={i}
					ref={(el) => {
						cards.current[i] = el;
					}}
					position-z={i * 0.02}>
					<mesh position-y={0.35}>
						<planeGeometry args={[0.62, 0.86]} />
						<meshBasicMaterial color={i === 2 ? P.accent : P.text} transparent opacity={i === 2 ? 1 : 0.5} side={THREE.DoubleSide} toneMapped={false} />
					</mesh>
				</group>
			))}
		</group>
	);
}

const EMBLEMS = [RelicEmblem, VoiceEmblem, CardsEmblem];

function Monolith({ block, emblem: Emblem, portrait }) {
	const w = portrait ? 5.4 : 4.6;
	const h = portrait ? 2.9 : 2.9;
	return (
		<Hoverable tilt={0.22} lift={0.5} scale={1.03}>
			<Photo src={block.src} width={w} height={h} dim={0.7} />
			<T font="mono" fontSize={0.11} letterSpacing={0.2} color={P.text} anchorX="left" position={[-w / 2 + 0.2, -h / 2 + 0.22, 0.02]}>
				{block.caption}
			</T>
			<group position={[w / 2 - 0.75, h / 2 - 0.75, 0.6]}>
				<Emblem />
			</group>
			<T font="serif" fontSize={1.5} color={P.ghost} anchorX="left" anchorY="top" position={[-w / 2, -h / 2 - 0.15, -0.1]}>
				{block.n}
			</T>
			<T font="serif" fontSize={portrait ? 0.62 : 0.52} color={P.text} anchorX="left" anchorY="top" position={[-w / 2 + (portrait ? 1.4 : 1.25), -h / 2 - 0.3, 0]}>
				{block.title}
			</T>
			<T
				font="mono"
				fontSize={portrait ? 0.19 : 0.15}
				lineHeight={1.55}
				color={P.textMuted}
				anchorX="left"
				anchorY="top"
				maxWidth={w}
				position={[-w / 2, -h / 2 - (portrait ? 1.35 : 1.15), 0]}>
				{block.desc}
			</T>
		</Hoverable>
	);
}

export function StackScene({ portrait, progress }) {
	const z = stationZ("capabilities");
	const i = STATION_INDEX.capabilities;
	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={[portrait ? 0 : -8.3, portrait ? 13.4 : 8.6, 0]} scale={portrait ? 0.62 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>02 — THE STACK</Label>
				<Extruded fontSize={0.95} anchorX={portrait ? "center" : "left"} anchorY="top" textAlign={portrait ? "center" : "left"} maxWidth={portrait ? 11 : 20} position={[0, -0.35, 0]}>
					Three systems. One impossible product.
				</Extruded>
			</Arrive>
			{BLOCKS.map((b, k) => (
				<Arrive
					key={b.n}
					progress={progress}
					station={i}
					delay={0.12 + k * 0.12}
					from={2}
					position={portrait ? [0, 9.6 - k * 5.1, 0] : [-6 + k * 6, 4.6 + (k === 1 ? -0.5 : 0), k === 1 ? 0.6 : 0]}
					scale={portrait ? 0.76 : 1}>
					<Monolith block={b} emblem={EMBLEMS[k]} portrait={portrait} />
				</Arrive>
			))}
		</group>
	);
}

/* ───────────────────────── 03 · The collection ───────────────────────── */

const TILES = [
	{ img: small(IMG.taj), name: "TAJ MAHAL" },
	{ img: small(IMG.colosseum), name: "COLOSSEUM" },
	{ img: small(IMG.machu), name: "MACHU PICCHU" },
	{ img: "/img12.webp", name: "TIKAL" },
	{ img: small(IMG.greatWall), name: "GREAT WALL" },
	{ img: small(IMG.pyramids), name: "PYRAMIDS" },
	{ img: "/img8.webp", name: "CARCASSONNE" },
	{ img: small(IMG.boudhanath), name: "BOUDHANATH" },
	{ img: "/img7.webp", name: "BAGAN" },
];

const hash = (n) => {
	const x = Math.sin(n * 91.3458) * 47453.5453;
	return x - Math.floor(x);
};

/** One tile: flies in from its own scattered pose and locks into the wall. */
function Tile({ tile, index, target, size, progress, station }) {
	const ref = useRef(null);
	const scatter = useMemo(
		() => ({
			x: (hash(index + 1) - 0.5) * 26,
			y: target[1] + (hash(index + 11) - 0.5) * 12,
			z: -6 - hash(index + 21) * 14,
			rx: (hash(index + 31) - 0.5) * 3,
			ry: (hash(index + 41) - 0.5) * 3,
		}),
		[index, target]
	);
	useFrame(() => {
		const g = ref.current;
		if (!g) return;
		const k = easeOut(stationWeight(progress.get(), station) * 1.5 - Math.abs(index - 4) * 0.05);
		g.position.set(
			THREE.MathUtils.lerp(scatter.x, target[0], k),
			THREE.MathUtils.lerp(scatter.y, target[1], k),
			THREE.MathUtils.lerp(scatter.z, target[2], k)
		);
		g.rotation.set(scatter.rx * (1 - k), scatter.ry * (1 - k), 0);
	});
	return (
		<group ref={ref}>
			<Hoverable tilt={0.4} lift={0.9} scale={1.12}>
				<Photo src={tile.img} width={size} height={size} dim={0.8} />
				<T font="mono" fontSize={0.11} letterSpacing={0.2} color={P.text} anchorX="left" position={[-size / 2 + 0.15, -size / 2 + 0.18, 0.02]}>
					{tile.name}
				</T>
			</Hoverable>
		</group>
	);
}

export function CollectionScene({ portrait, progress }) {
	const z = stationZ("collection");
	const i = STATION_INDEX.collection;
	const size = portrait ? 2.35 : 2.55;
	const targets = useMemo(() => {
		const [ox, oy] = portrait ? [0, 6.2] : [3.2, 4.4];
		const step = size + 0.22;
		return TILES.map((_, k) => [ox + ((k % 3) - 1) * step, oy - (Math.floor(k / 3) - 1) * step, 0]);
	}, [portrait, size]);
	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={portrait ? [0, 12.6, 0] : [-8.2, 6.6, 0]} scale={portrait ? 0.7 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>{"// THE COLLECTION"}</Label>
				<Extruded fontSize={1.45} anchorX={portrait ? "center" : "left"} anchorY="top" maxWidth={portrait ? 12 : 5.6} lineHeight={0.95} textAlign={portrait ? "center" : "left"} position={[0, -0.35, 0]}>
					A world, rebuilt.
				</Extruded>
				{!portrait && (
					<T font="mono" fontSize={0.16} lineHeight={1.55} color={P.textMuted} anchorX="left" anchorY="top" maxWidth={4.8} position={[0, -3.5, 0]}>
						Assembled across the ages. Point at a tile to lift it out of the wall.
					</T>
				)}
			</Arrive>
			{TILES.map((t, k) => (
				<Tile key={t.name} tile={t} index={k} target={targets[k]} size={size} progress={progress} station={i} />
			))}
		</group>
	);
}

/* ───────────────────────── 04 · In the field ───────────────────────── */

/** The AR prototype footage on a curved cinema screen; plays only while the camera is near. */
function Screen({ progress, station, portrait }) {
	const texture = useVideoTexture("/shot2.mp4", { start: false, muted: true, loop: true, playsInline: true, crossOrigin: "anonymous" });
	const playing = useRef(false);
	useFrame(() => {
		const video = texture.image;
		const near = stationWeight(progress.get(), station) > 0.05;
		if (near && !playing.current) {
			playing.current = true;
			video.play?.().catch(() => {
				playing.current = false;
			});
		} else if (!near && playing.current) {
			playing.current = false;
			video.pause?.();
		}
	});
	const radius = portrait ? 9 : 16;
	const height = portrait ? 4.6 : 6.6;
	const arc = portrait ? 0.78 : 0.86;
	// The camera sits inside the cylinder and sees the inside of its far wall:
	// flip the texture across, or the footage reads mirrored.
	const screen = useMemo(() => {
		const g = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true, Math.PI - arc / 2, arc);
		const uv = g.attributes.uv;
		for (let k = 0; k < uv.count; k += 1) uv.setX(k, 1 - uv.getX(k));
		return g;
	}, [radius, height, arc]);
	return (
		<group position={[0, portrait ? 7.8 : 5.7, radius - 1]}>
			<mesh geometry={screen}>
				<meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} color={[0.7, 0.7, 0.7]} />
			</mesh>
			{/* Hairline frame above and below the screen. */}
			{[height / 2 + 0.08, -height / 2 - 0.08].map((y) => (
				<mesh key={y} position-y={y}>
					<cylinderGeometry args={[radius, radius, 0.025, 64, 1, true, Math.PI - arc / 2, arc]} />
					<meshBasicMaterial color={P.accent} side={THREE.BackSide} toneMapped={false} />
				</mesh>
			))}
		</group>
	);
}

export function FieldScene({ portrait, progress }) {
	const z = stationZ("field");
	const i = STATION_INDEX.field;
	return (
		<group position={[0, 0, z]}>
			<Screen progress={progress} station={i} portrait={portrait} />
			<Arrive progress={progress} station={i} position={portrait ? [0, 3.2, 1] : [0, 3.3, 1.6]} scale={portrait ? 0.62 : 1}>
				<Label>{"// IN THE FIELD"}</Label>
				<Extruded color={P.text} fontSize={1.5} anchorY="top" position={[0, -0.35, 0]}>
					Heritage, in motion.
				</Extruded>
				<T font="mono" fontSize={portrait ? 0.24 : 0.16} color={P.textMuted} maxWidth={portrait ? 9 : 7} textAlign="center" anchorY="top" lineHeight={1.5} position={[0, -2.1, 0]}>
					Real footage from the Epocheye AR prototype. Point, and the past renders in place.
				</T>
			</Arrive>
		</group>
	);
}

/* ───────────────────────── 05 · How it works ───────────────────────── */

const ERAS = [
	{ num: "80", year: "80 AD", label: "RECONSTRUCTING · COLOSSEUM, 80 AD", img: small(IMG.colosseum) },
	{ num: "1150", year: "1150", label: "STANDING · ANGKOR WAT, 1150", img: "/img6.webp" },
	{ num: "1450", year: "1450", label: "BUILT · MACHU PICCHU, 1450", img: small(IMG.machu) },
	{ num: "NOW", year: "TODAY", label: "TODAY · EXPLORE IT IN AR", img: small(IMG.greatWall) },
];

const STEPS = [
	["01", "Point", "Aim your phone at any heritage monument in front of you."],
	["02", "Scrub", "Drag the timeline to slide through centuries of its history."],
	["03", "Travel", "Unlock stories and reconstructions verified by historians."],
];

/** Four eras on a turning ring: it steps on by itself, or jump with the timeline. */
function EraRing({ era, portrait }) {
	const ref = useRef(null);
	const angle = useRef(0);
	const w = portrait ? 4.2 : 7.2;
	const h = w * 0.56;
	const radius = w / 2 / Math.tan(Math.PI / ERAS.length) + 0.3;
	useFrame((state, delta) => {
		const g = ref.current;
		if (!g) return;
		angle.current = THREE.MathUtils.damp(angle.current, -era * (Math.PI / 2), 3.5, delta);
		g.rotation.y = angle.current + state.pointer.x * 0.08;
	});
	return (
		<group position-z={-radius}>
			<group ref={ref}>
				{ERAS.map((e, k) => (
					<group key={e.num} rotation-y={(k * Math.PI) / 2}>
						<group position-z={radius}>
							<Photo src={e.img} width={w} height={h} dim={k === era ? 0.9 : 0.35} />
							<T font="mono" fontSize={0.14} letterSpacing={0.2} color={P.accent} anchorX="left" position={[-w / 2 + 0.2, h / 2 - 0.25, 0.02]}>
								{e.year}
							</T>
						</group>
					</group>
				))}
			</group>
		</group>
	);
}

function TimelineStop({ e, k, active, x, onPick }) {
	return (
		<group
			position={[x, 0, 0]}
			onClick={(ev) => {
				ev.stopPropagation();
				onPick(k);
			}}
			onPointerOver={() => setCursor("pointer")}
			onPointerOut={() => setCursor("")}>
			<mesh position-y={0.32}>
				<circleGeometry args={[active ? 0.11 : 0.07, 24]} />
				<meshBasicMaterial color={active ? P.accent : P.textMuted} toneMapped={false} />
			</mesh>
			<T font="mono" fontSize={0.16} letterSpacing={0.18} color={active ? P.accent : P.textMuted} position-y={-0.05}>
				{e.year}
			</T>
			<mesh position-y={0.1} visible={false}>
				<planeGeometry args={[1.4, 0.9]} />
			</mesh>
		</group>
	);
}

export function HowScene({ portrait, progress }) {
	const z = stationZ("how-it-works");
	const i = STATION_INDEX["how-it-works"];
	const [era, setEra] = useState(0);
	const held = useRef(0); // a picked era holds a while before the ring steps on again

	// Steps on every few seconds while the camera is here.
	useEffect(() => {
		const id = setInterval(() => {
			if (stationWeight(progress.get(), i) < 0.6 || performance.now() < held.current) return;
			setEra((e) => (e + 1) % ERAS.length);
		}, 3200);
		return () => clearInterval(id);
	}, [progress, i]);

	const pick = (k) => {
		held.current = performance.now() + 8000;
		setEra(k);
	};
	const step = Math.min(STEPS.length - 1, era);
	const rail = portrait ? 6.6 : 9;

	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={portrait ? [0, 13.6, 0] : [-8.2, 8.9, 0]} scale={portrait ? 0.62 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>03 — HOW IT WORKS</Label>
				<Extruded fontSize={1.05} anchorX={portrait ? "center" : "left"} anchorY="top" position={[0, -0.35, 0]}>
					Point. Scrub. Travel.
				</Extruded>
			</Arrive>
			<group position={portrait ? [0, 8.2, 0] : [2.6, 5.2, 0]}>
				<EraRing era={era} portrait={portrait} />
				<T font="serif" fontSize={portrait ? 2.4 : 4.4} color={P.text} fillOpacity={0.07} anchorX="right" anchorY="top" position={[portrait ? 2.9 : 5.6, portrait ? 3.6 : 4.6, -6]}>
					{ERAS[era].num}
				</T>
				<T font="mono" fontSize={portrait ? 0.15 : 0.15} letterSpacing={0.2} color={P.accent} anchorX="left" position={[portrait ? -2.7 : -3.5, portrait ? -2 : -2.45, 0.2]}>
					{ERAS[era].label}
				</T>
				<group position={[0, portrait ? -2.9 : -3.4, 0.2]}>
					<mesh position-y={0.32}>
						<planeGeometry args={[rail, 0.012]} />
						<meshBasicMaterial color={P.textFaint} toneMapped={false} />
					</mesh>
					<mesh position={[-rail / 2 + (rail * era) / (ERAS.length - 1) / 2, 0.32, 0.001]} scale-x={Math.max(0.001, era / (ERAS.length - 1))}>
						<planeGeometry args={[rail, 0.03]} />
						<meshBasicMaterial color={P.accent} toneMapped={false} />
					</mesh>
					{ERAS.map((e, k) => (
						<TimelineStop key={e.num} e={e} k={k} active={k === era} x={-rail / 2 + (rail * k) / (ERAS.length - 1)} onPick={pick} />
					))}
				</group>
			</group>
			<group position={portrait ? [0, 2.6, 0.5] : [-8.2, 4.6, 0.5]} scale={portrait ? 0.85 : 1}>
				{STEPS.map(([n, title, desc], k) => (
					<group key={n} position={portrait ? [-3.2 + k * 3.2, 0, 0] : [0, -k * 1.75, 0]}>
						<T font="serif" fontSize={0.55} color={k === step ? P.accent : P.textFaint} anchorX="left" anchorY="top">
							{n}
						</T>
						<T font="serif" fontSize={0.42} color={k === step ? P.text : P.textMuted} anchorX="left" anchorY="top" position={[portrait ? 0 : 0.85, portrait ? -0.6 : 0, 0]}>
							{title}
						</T>
						<T
							font="mono"
							fontSize={portrait ? 0.15 : 0.13}
							lineHeight={1.5}
							color={k === step ? P.textSoft : P.textFaint}
							anchorX="left"
							anchorY="top"
							maxWidth={portrait ? 2.9 : 3.6}
							position={[portrait ? 0 : 0.85, portrait ? -1.15 : -0.6, 0]}>
							{desc}
						</T>
					</group>
				))}
			</group>
		</group>
	);
}
