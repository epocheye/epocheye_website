"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

import { IMG } from "@/components/fx/heritageImages";
import { PALETTE as P } from "./theme";
import { STATION_INDEX, stationWeight, stationZ } from "./stations";
import { Arrive, Extruded, Hoverable, Label, Photo, T, setCursor } from "./kit";

const small = (src) => src.replace("w=1600", "w=900");

/* ───────────────────────── 06 · Where we're headed ───────────────────────── */

const DESTINATIONS = [
	{ name: "Taj Mahal", place: "India", coord: "27.17°N 78.04°E", lat: 27.17, lon: 78.04, img: small(IMG.taj) },
	{ name: "Colosseum", place: "Italy", coord: "41.89°N 12.49°E", lat: 41.89, lon: 12.49, img: small(IMG.colosseum) },
	{ name: "Machu Picchu", place: "Peru", coord: "13.16°S 72.54°W", lat: -13.16, lon: -72.54, img: small(IMG.machu) },
	{ name: "Great Wall", place: "China", coord: "40.43°N 116.57°E", lat: 40.43, lon: 116.57, img: small(IMG.greatWall) },
	{ name: "Pyramids of Giza", place: "Egypt", coord: "29.98°N 31.13°E", lat: 29.98, lon: 31.13, img: small(IMG.pyramids) },
	{ name: "Boudhanath Stupa", place: "Nepal", coord: "27.72°N 85.36°E", lat: 27.72, lon: 85.36, img: small(IMG.boudhanath) },
	{ name: "Tikal", place: "Guatemala", coord: "17.22°N 89.62°W", lat: 17.22, lon: -89.62, img: "/img12.webp" },
	{ name: "Carcassonne", place: "France", coord: "43.21°N 02.36°E", lat: 43.21, lon: 2.36, img: "/img8.webp" },
];

const RAD = Math.PI / 180;
/** Latitude/longitude to a point on a sphere whose longitude 0 faces the camera. */
const onSphere = (lat, lon, r) => [r * Math.cos(lat * RAD) * Math.sin(lon * RAD), r * Math.sin(lat * RAD), r * Math.cos(lat * RAD) * Math.cos(lon * RAD)];

/** Evenly spread dots (Fibonacci sphere) for the globe's surface. */
function useDots(count, r) {
	return useMemo(() => {
		const pos = new Float32Array(count * 3);
		const golden = Math.PI * (3 - Math.sqrt(5));
		for (let i = 0; i < count; i += 1) {
			const y = 1 - (i / (count - 1)) * 2;
			const ring = Math.sqrt(1 - y * y);
			const th = golden * i;
			pos[i * 3] = Math.cos(th) * ring * r;
			pos[i * 3 + 1] = y * r;
			pos[i * 3 + 2] = Math.sin(th) * ring * r;
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
		return g;
	}, [count, r]);
}

/**
 * The roster on a dotted globe. It turns to face the picked site; drag it to
 * spin it yourself, or point at a pin or a name to pick that site.
 */
function Globe({ selected, onSelect, radius, onDragging }) {
	const spin = useRef(null);
	const drag = useRef(null); // { x, y, ry, rx } while dragging
	const free = useRef({ ry: 0, rx: 0, until: 0 }); // a drag holds the globe where it was left
	const dots = useDots(1800, radius);
	useFrame((_, delta) => {
		const g = spin.current;
		if (!g) return;
		if (drag.current) return;
		const d = DESTINATIONS[selected];
		const held = performance.now() < free.current.until;
		const ry = held ? free.current.ry : -d.lon * RAD;
		const rx = held ? free.current.rx : d.lat * RAD;
		// Shortest way round.
		const diff = Math.atan2(Math.sin(ry - g.rotation.y), Math.cos(ry - g.rotation.y));
		g.rotation.y = THREE.MathUtils.damp(g.rotation.y, g.rotation.y + diff, 3, delta);
		g.rotation.x = THREE.MathUtils.damp(g.rotation.x, rx, 3, delta);
	});
	const end = () => {
		if (!drag.current) return;
		const g = spin.current;
		free.current = { ry: g.rotation.y, rx: g.rotation.x, until: performance.now() + 6000 };
		drag.current = null;
		onDragging(false);
		setCursor("");
	};
	return (
		<group>
			<group ref={spin}>
				<points geometry={dots}>
					<pointsMaterial color={P.text} size={0.035} sizeAttenuation transparent opacity={0.55} depthWrite={false} />
				</points>
				<mesh
					onPointerDown={(e) => {
						e.stopPropagation();
						e.target.setPointerCapture?.(e.pointerId);
						drag.current = { x: e.clientX, y: e.clientY, ry: spin.current.rotation.y, rx: spin.current.rotation.x };
						onDragging(true);
						setCursor("grabbing");
					}}
					onPointerMove={(e) => {
						const d = drag.current;
						if (!d) return;
						spin.current.rotation.y = d.ry + (e.clientX - d.x) * 0.008;
						spin.current.rotation.x = THREE.MathUtils.clamp(d.rx + (e.clientY - d.y) * 0.006, -1.1, 1.1);
					}}
					onPointerUp={end}
					onPointerLeave={end}
					onPointerOver={() => !drag.current && setCursor("grab")}
					onPointerOut={() => !drag.current && setCursor("")}>
					<sphereGeometry args={[radius * 0.985, 48, 32]} />
					<meshBasicMaterial color={P.bg2} transparent opacity={0.85} />
				</mesh>
				{DESTINATIONS.map((d, k) => {
					const p = onSphere(d.lat, d.lon, radius);
					const on = k === selected;
					return (
						<group
							key={d.name}
							position={p}
							onPointerOver={(e) => {
								e.stopPropagation();
								onSelect(k);
								setCursor("pointer");
							}}
							onPointerOut={() => setCursor("")}>
							<mesh>
								<sphereGeometry args={[on ? 0.13 : 0.08, 16, 16]} />
								<meshBasicMaterial color={on ? P.accent : P.text} toneMapped={false} />
							</mesh>
							<mesh visible={false}>
								<sphereGeometry args={[0.35, 8, 8]} />
							</mesh>
						</group>
					);
				})}
			</group>
			{/* A fixed halo: the globe turns inside it. */}
			<mesh>
				<torusGeometry args={[radius * 1.12, 0.008, 6, 160]} />
				<meshBasicMaterial color={P.accent} toneMapped={false} transparent opacity={0.6} />
			</mesh>
		</group>
	);
}

export function AtlasScene({ portrait, progress }) {
	const z = stationZ("destinations");
	const i = STATION_INDEX.destinations;
	const [selected, setSelected] = useState(0);
	const busy = useRef(false); // pointer on the globe or the list: don't step on
	const setBusy = (v) => {
		busy.current = v;
	};

	// Steps through the roster while the camera is here and nobody is pointing.
	useEffect(() => {
		const id = setInterval(() => {
			if (busy.current || stationWeight(progress.get(), i) < 0.6) return;
			setSelected((s) => (s + 1) % DESTINATIONS.length);
		}, 3600);
		return () => clearInterval(id);
	}, [progress, i]);

	const pick = (k) => {
		busy.current = true;
		setSelected(k);
	};
	const d = DESTINATIONS[selected];
	const radius = portrait ? 2.9 : 3;

	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={portrait ? [0, 13.4, 0] : [-8.2, 8.8, 0]} scale={portrait ? 0.62 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>{"04 — WHERE WE'RE HEADED"}</Label>
				<Extruded fontSize={1.05} anchorX={portrait ? "center" : "left"} anchorY="top" position={[0, -0.35, 0]}>
					{"We're coming to these."}
				</Extruded>
				<T font="mono" fontSize={0.15} letterSpacing={0.18} color={P.textMuted} anchorX={portrait ? "center" : "left"} position={[0, -1.65, 0]}>
					5 CONTINENTS · DRAG THE GLOBE, OR POINT AT A NAME
				</T>
			</Arrive>

			<group position={portrait ? [0, 8, 0] : [5, 4.4, 0]} onPointerOut={() => setBusy(false)}>
				<Globe selected={selected} onSelect={pick} radius={radius} onDragging={setBusy} />
			</group>

			{/* The picked site, as a card. Every card is mounted so switching never waits on a texture. */}
			<group position={portrait ? [0, 2.4, 1.2] : [-1.7, 4.2, 1]} scale={portrait ? 0.8 : 1}>
				{DESTINATIONS.map((x, k) => (
					<group key={x.name} visible={k === selected}>
						<Photo src={x.img} width={3.6} height={2.4} dim={0.85} />
					</group>
				))}
				<T font="mono" fontSize={0.12} letterSpacing={0.2} color={P.accent} anchorX="left" position={[-1.65, 1.0, 0.03]}>
					{`${String(selected + 1).padStart(2, "0")} · COMING 2026`}
				</T>
				<T font="serif" fontSize={0.48} color={P.text} anchorX="left" anchorY="top" position={[-1.8, -1.35, 0]}>
					{d.name}
				</T>
				<T font="mono" fontSize={0.13} letterSpacing={0.12} color={P.textMuted} anchorX="left" anchorY="top" position={[-1.8, -1.95, 0]}>
					{`${d.place.toUpperCase()} · ${d.coord}`}
				</T>
			</group>

			{/* The roster: point at a name to turn the globe to it. */}
			{!portrait && (
				<group position={[-8.2, 5.6, 0.5]} onPointerOut={() => setBusy(false)}>
					{DESTINATIONS.map((x, k) => (
						<group
							key={x.name}
							position={[0, -k * 0.5, 0]}
							onPointerOver={(e) => {
								e.stopPropagation();
								pick(k);
								setCursor("pointer");
							}}
							onPointerOut={() => setCursor("")}>
							<T font="mono" fontSize={0.14} letterSpacing={0.16} color={k === selected ? P.accent : P.textFaint} anchorX="left">
								{`${String(k + 1).padStart(2, "0")}  ${x.name.toUpperCase()}`}
							</T>
							<mesh position={[1.2, 0, -0.01]} visible={false}>
								<planeGeometry args={[2.6, 0.45]} />
							</mesh>
						</group>
					))}
				</group>
			)}
		</group>
	);
}

/* ───────────────────────── 07 · The network ───────────────────────── */

const CREATORS_URL = "https://creators.epocheye.com";

const CARDS = [
	{
		tag: "// APPLICATIONS OPEN",
		title: "Creators Program is live",
		desc: "Turn heritage storytelling into income. Apply, get verified, earn on every booking you drive.",
		cta: "APPLY AS A CREATOR >",
		img: "/img11.webp",
	},
	{
		tag: "// LIVE DASHBOARD",
		title: "Payout tracking, in real time",
		desc: "Watch clicks, conversions, and UPI payouts update live. Full transparency on every rupee you earn.",
		cta: "CREATOR LOGIN >",
		img: "/img12.webp",
	},
];

function PortalCard({ card, portrait }) {
	const w = portrait ? 6 : 5.6;
	const ph = portrait ? 2.6 : 2.9;
	const body = 2.4;
	return (
		<Hoverable href={CREATORS_URL} tilt={0.2} lift={0.6} scale={1.03}>
			<group position-y={body / 2}>
				<Photo src={card.img} width={w} height={ph} dim={0.75} />
			</group>
			<RoundedBox args={[w + 0.06, body, 0.1]} radius={0.04} smoothness={3} position={[0, -ph / 2, -0.05]}>
				<meshStandardMaterial color={P.bg2} roughness={0.6} />
			</RoundedBox>
			<group position={[-w / 2 + 0.35, -ph / 2 + body / 2 - 0.35, 0.02]}>
				<T font="mono" fontSize={0.13} letterSpacing={0.2} color={P.accent} anchorX="left" anchorY="top">
					{card.tag}
				</T>
				<T font="serif" fontSize={0.42} color={P.text} anchorX="left" anchorY="top" position={[0, -0.32, 0]}>
					{card.title}
				</T>
				<T font="mono" fontSize={0.14} lineHeight={1.5} color={P.textMuted} anchorX="left" anchorY="top" maxWidth={w - 0.7} position={[0, -0.95, 0]}>
					{card.desc}
				</T>
				<T font="mono" fontSize={0.14} letterSpacing={0.18} color={P.accent} anchorX="left" anchorY="top" position={[0, -1.7, 0]}>
					{card.cta}
				</T>
			</group>
		</Hoverable>
	);
}

const TRUST = "VERIFIED BY HISTORIANS  /  100% ACCURATE SOURCES  /  EXPERT-CURATED CONTENT";

export function NetworkScene({ portrait, progress }) {
	const z = stationZ("creators");
	const i = STATION_INDEX.creators;
	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={portrait ? [0, 13.8, 0] : [-8.2, 9, 0]} scale={portrait ? 0.6 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>05 — THE NETWORK</Label>
				<Extruded fontSize={0.95} anchorX={portrait ? "center" : "left"} anchorY="top" maxWidth={portrait ? 11 : 20} textAlign={portrait ? "center" : "left"} position={[0, -0.35, 0]}>
					Built with the people who tell these stories.
				</Extruded>
			</Arrive>
			{CARDS.map((c, k) => (
				<Arrive
					key={c.title}
					progress={progress}
					station={i}
					delay={0.15 + k * 0.15}
					from={2}
					position={portrait ? [0, 8.6 - k * 5.8, 0] : [k === 0 ? -3.2 : 3.2, k === 0 ? 4.6 : 3.9, 0]}
					scale={portrait ? 0.82 : 1}>
					<PortalCard card={c} portrait={portrait} />
				</Arrive>
			))}
			<T font="mono" fontSize={portrait ? 0.15 : 0.14} letterSpacing={0.2} color={P.textMuted} maxWidth={portrait ? 7 : 20} textAlign="center" position={portrait ? [0, -1.6, 0.5] : [0, 0.9, 1]}>
				{TRUST}
			</T>
		</group>
	);
}

/* ───────────────────────── 08 · The team ───────────────────────── */

function GlassSlab({ width, height }) {
	return (
		<RoundedBox args={[width, height, 0.12]} radius={0.08} smoothness={4} position-z={-0.08}>
			<meshStandardMaterial color="#ffffff" transparent opacity={0.05} roughness={0.15} metalness={0.5} />
		</RoundedBox>
	);
}

/** Lime pill that leans toward the pointer and opens an email. */
function TalkButton(props) {
	const hover = useRef(false);
	const ref = useRef(null);
	useFrame((state, delta) => {
		const g = ref.current;
		if (!g) return;
		const on = hover.current;
		g.position.x = THREE.MathUtils.damp(g.position.x, on ? state.pointer.x * 0.25 : 0, 6, delta);
		g.position.y = THREE.MathUtils.damp(g.position.y, on ? state.pointer.y * 0.15 : 0, 6, delta);
		g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, on ? 1.08 : 1, 8, delta));
	});
	return (
		<group {...props}>
			<group
				ref={ref}
				onPointerOver={(e) => {
					e.stopPropagation();
					hover.current = true;
					setCursor("pointer");
				}}
				onPointerOut={() => {
					hover.current = false;
					setCursor("");
				}}
				onClick={(e) => {
					e.stopPropagation();
					window.location.href = "mailto:sambit@epocheye.app";
				}}>
				<RoundedBox args={[3.2, 0.78, 0.22]} radius={0.38} smoothness={6}>
					<meshStandardMaterial color={P.accent} emissive={P.accent} emissiveIntensity={0.35} roughness={0.35} />
				</RoundedBox>
				<T font="monoBold" fontSize={0.2} letterSpacing={0.2} color="#0A0A0B" position-z={0.12}>
					GET IN TOUCH &gt;
				</T>
			</group>
		</group>
	);
}

export function TeamScene({ portrait, progress }) {
	const z = stationZ("team");
	const i = STATION_INDEX.team;
	const w = 6.6;
	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={portrait ? [0, 13.6, 0] : [-8.2, 9, 0]} scale={portrait ? 0.62 : 1}>
				<Label anchorX={portrait ? "center" : "left"}>06 — THE TEAM</Label>
				<Extruded fontSize={1.45} anchorX={portrait ? "center" : "left"} anchorY="top" position={[0, -0.35, 0]}>
					Operators, not tourists.
				</Extruded>
			</Arrive>
			<Arrive progress={progress} station={i} delay={0.15} from={2} position={portrait ? [0, 8.4, 0] : [-3.7, 3.9, 0]} scale={portrait ? 0.82 : 1}>
				<Hoverable tilt={0.18} lift={0.4} scale={1.02}>
					<GlassSlab width={w} height={3.9} />
					<group position={[-w / 2 + 0.45, 1.5, 0]}>
						<T font="serif" fontSize={0.62} color={P.text} anchorX="left" anchorY="top">
							Sambit Singha
						</T>
						<T font="mono" fontSize={0.14} letterSpacing={0.22} color={P.accent} anchorX="left" anchorY="top" position={[0, -0.85, 0]}>
							FOUNDER &amp; CEO
						</T>
						<T font="mono" fontSize={0.15} lineHeight={1.55} color={P.textMuted} anchorX="left" anchorY="top" maxWidth={w - 0.9} position={[0, -1.35, 0]}>
							Full-stack engineer and product builder. Shipped at two startups before building the Epocheye AR prototype from
							scratch.
						</T>
					</group>
				</Hoverable>
			</Arrive>
			<Arrive progress={progress} station={i} delay={0.3} from={2} position={portrait ? [0, 3, 0] : [3.7, 3.9, 0.3]} scale={portrait ? 0.82 : 1}>
				<GlassSlab width={w} height={3.9} />
				<group position={[-w / 2 + 0.45, 1.55, 0]}>
					<T font="mono" fontSize={0.14} letterSpacing={0.22} color={P.accent} anchorX="left" anchorY="top">
						{"// LET'S TALK"}
					</T>
					<T font="serif" fontSize={0.4} lineHeight={1.1} color={P.text} anchorX="left" anchorY="top" maxWidth={w - 0.9} position={[0, -0.4, 0]}>
						{"Investor or partner? Let's build the future of heritage."}
					</T>
					<T font="mono" fontSize={0.14} lineHeight={1.5} color={P.textMuted} anchorX="left" anchorY="top" maxWidth={w - 0.9} position={[0, -1.4, 0]}>
						{"We're raising to scale coverage across continents. If you back deep-tech with cultural impact, we should talk."}
					</T>
					<TalkButton position={[1.6, -2.55, 0.1]} />
				</group>
			</Arrive>
		</group>
	);
}
