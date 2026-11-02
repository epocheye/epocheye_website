"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";

import { LIVE_MONUMENTS } from "@/lib/monuments/live";
import { HoloRings, KonarkScan } from "@/components/preorder/Holo";
import { PALETTE as P } from "./theme";
import { STATION_INDEX, stationWeight, stationZ } from "./stations";
import { Arrive, Extruded, Hoverable, Label, T, easeOut, openUrl, setCursor } from "./kit";

/* ───────────────────────── 00 · See through time ───────────────────────── */

const MARQUEE = "LIVE AT TIPU SULTAN'S SUMMER PALACE  /  BANGALORE FORT  /  VICTORIA MEMORIAL  /  INDIAN MUSEUM  /  BACKED BY STPI · AWS · DRAPER  /  ";

/** The live sites, curved into a ring that turns around the scan. */
function MarqueeRing({ radius, ...props }) {
	const ref = useRef(null);
	useFrame((_, delta) => {
		if (ref.current) ref.current.rotation.y += delta * 0.12;
	});
	return (
		<group {...props}>
			<group ref={ref}>
				{[0, Math.PI].map((r) => (
					<group key={r} rotation-y={r}>
						<T font="mono" fontSize={0.16} letterSpacing={0.18} color={P.accent} curveRadius={radius} position-z={radius}>
							{MARQUEE}
						</T>
					</group>
				))}
			</group>
		</group>
	);
}

export function ManifestoScene({ portrait, progress, intro }) {
	const title = useRef(null);
	const scan = useRef(null);
	// The points hold their shape here and blow apart as the camera leaves.
	const assemble = { get: () => intro.get() * (0.3 + 0.7 * stationWeight(progress.get(), 0)) };
	useFrame(() => {
		if (scan.current) scan.current.visible = progress.get() < 0.16;
		const g = title.current;
		if (!g) return;
		const k = easeOut(intro.get() * 1.3 - 0.15);
		g.position.y = (portrait ? 1.2 : 3.6) - (1 - k) * 1.4;
		g.rotation.x = (1 - k) * -0.7;
	});
	const cloud = portrait ? { position: [0, 8.4, -1], scale: 2.9 } : { position: [4.6, 2.6, -1.5], scale: 3.7 };
	const anchor = portrait ? "center" : "left";
	const s = portrait ? 0.6 : 1;
	return (
		<>
			<group ref={scan}>
				<KonarkScan assemble={assemble} interactive position={cloud.position} scale={cloud.scale} size={portrait ? 15 : 18} />
				<MarqueeRing radius={portrait ? 3 : 2.9} position={[cloud.position[0], portrait ? 5.6 : 0.35, cloud.position[2]]} />
			</group>
			<HoloRings radius={portrait ? 2.4 : 3.4} fill={0.02} position={[cloud.position[0], portrait ? 5.5 : 0.02, cloud.position[2]]} />
			<group ref={title} position={[portrait ? 0 : -7.4, 3.6, 0.5]} scale={s}>
				<Label anchorX={anchor} position={[0, 3.1, 0]}>
					EPOCHEYE — EST. 2026
				</Label>
				<Extruded fontSize={2.1} anchorX={anchor} position={[0, 2.05, 0]}>
					SEE
				</Extruded>
				<Extruded font="italic" color={P.textMuted} fontSize={1.85} anchorX={anchor} position={[0, 0.45, 0]}>
					THROUGH
				</Extruded>
				<Extruded color={P.accent} fontSize={2.1} anchorX={anchor} position={[0, -1.15, 0]}>
					TIME.
				</Extruded>
				<T
					fontSize={portrait ? 0.3 : 0.19}
					lineHeight={1.5}
					color={P.textSoft}
					anchorX={anchor}
					anchorY="top"
					textAlign={anchor}
					maxWidth={portrait ? 9 : 5.4}
					position={[0, -2.25, 0]}>
					Historical intelligence for the physical world. Point your phone at a monument and see what the record says
					stood there.
				</T>
			</group>
			<T font="mono" fontSize={0.13} letterSpacing={0.22} color={P.textMuted} position={[cloud.position[0], portrait ? 11.7 : 5.9, cloud.position[2]]}>
				THE RECORD, AS POINTS · MOVE YOUR POINTER THROUGH IT
			</T>
		</>
	);
}

/* ───────────────────────── 01 · Where it works ───────────────────────── */

/** A light beam standing on a live monument. Hover lifts it; click opens its page. */
function Beacon({ monument, position, portrait }) {
	const hover = useRef(false);
	const beam = useRef(null);
	const gem = useRef(null);
	const cta = useRef(null);
	useFrame((state, delta) => {
		const on = hover.current;
		if (beam.current) {
			beam.current.scale.y = THREE.MathUtils.damp(beam.current.scale.y, on ? 1.35 : 1, 6, delta);
			beam.current.material.opacity = THREE.MathUtils.damp(beam.current.material.opacity, on ? 0.4 : 0.14, 6, delta);
		}
		if (gem.current) {
			gem.current.rotation.y += delta * (on ? 2.4 : 0.8);
			gem.current.position.y = (on ? 3.5 : 2.85) + Math.sin(state.clock.elapsedTime * 1.6 + position[0]) * 0.08;
		}
		if (cta.current) cta.current.fillOpacity = THREE.MathUtils.damp(cta.current.fillOpacity ?? 0, on ? 1 : 0, 8, delta);
	});
	const go = () => openUrl(`/monuments/${monument.slug}`);
	return (
		<group
			position={position}
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
				go();
			}}>
			<mesh ref={beam} position-y={1.25} scale-y={1}>
				<cylinderGeometry args={[0.07, 0.22, 2.5, 24, 1, true]} />
				<meshBasicMaterial color={P.accent} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
			</mesh>
			<mesh rotation-x={-Math.PI / 2} position-y={0.02}>
				<ringGeometry args={[0.32, 0.4, 48]} />
				<meshBasicMaterial color={P.accent} toneMapped={false} />
			</mesh>
			<mesh ref={gem} position-y={2.85}>
				<octahedronGeometry args={[0.28, 0]} />
				<meshStandardMaterial color={P.accent} emissive={P.accent} emissiveIntensity={0.6} flatShading />
			</mesh>
			{/* Generous invisible hit area, so the thin beam is easy to point at. */}
			<mesh position-y={1.6} visible={false}>
				<boxGeometry args={[portrait ? 2.6 : 2.4, 3.6, 1.2]} />
			</mesh>
			<T font="serif" fontSize={portrait ? 0.36 : 0.3} color={P.text} maxWidth={portrait ? 3.3 : 2.6} textAlign="center" anchorY="top" lineHeight={1.05} position={[0, -0.25, 0.3]}>
				{monument.name}
			</T>
			<T ref={cta} font="mono" fontSize={0.12} letterSpacing={0.22} color={P.accent} fillOpacity={0} position={[0, 4.05, 0]}>
				OPEN THE MONUMENT &gt;
			</T>
		</group>
	);
}

function Logo({ src, width, height, ...props }) {
	const texture = useTexture(src);
	return (
		<Hoverable tilt={0.35} lift={0.3} scale={1.06} {...props}>
			<RoundedBox args={[2.1, 1.25, 0.08]} radius={0.12} smoothness={4} position-z={-0.06}>
				<meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.2} metalness={0.4} />
			</RoundedBox>
			<mesh>
				<planeGeometry args={[width, height]} />
				<meshBasicMaterial map={texture} transparent toneMapped={false} />
			</mesh>
		</Hoverable>
	);
}

const CITIES = ["Bengaluru", "Kolkata"];

export function WhereScene({ portrait, progress }) {
	const z = stationZ("where");
	const i = STATION_INDEX.where;
	const cityX = portrait ? 0 : 3.9;
	return (
		<group position={[0, 0, z]}>
			<Arrive progress={progress} station={i} position={[portrait ? 0 : -7.6, portrait ? 13.8 : 7.4, 0]} scale={portrait ? 0.6 : 1}>
				<Label anchorX={portrait ? "center" : "left"} position={[0, 0, 0]}>
					01 — WHERE IT WORKS
				</Label>
				<Extruded fontSize={1.2} anchorX={portrait ? "center" : "left"} anchorY="top" maxWidth={portrait ? 10 : 20} textAlign={portrait ? "center" : "left"} lineHeight={1} position={[0, -0.35, 0]}>
					Live at four monuments.
				</Extruded>
			</Arrive>
			{CITIES.map((city, c) => {
				const monuments = LIVE_MONUMENTS.filter((m) => m.city === city);
				const centre = portrait ? [0, c === 0 ? 7.4 : 2.2, 0] : [c === 0 ? -cityX : cityX, 1.3, 0];
				return (
					<group key={city} position={centre}>
						<HoloRings radius={2.6} fill={0.02} />
						<T font="mono" fontSize={0.2} letterSpacing={0.3} color={P.textMuted} position={[0, 0.05, 2.95]} rotation-x={-Math.PI / 2}>
							{city.toUpperCase()}
						</T>
						{monuments.map((m, k) => (
							<Beacon key={m.slug} monument={m} portrait={portrait} position={[k === 0 ? -1.3 : 1.3, 0, k === 0 ? 0.2 : -0.2]} />
						))}
					</group>
				);
			})}
			<group position={portrait ? [0, -0.5, 1] : [0, 0.1, 3.2]} scale={0.8}>
				<Label color={P.textMuted} position={[0, 0.95, 0]}>
					BACKED BY
				</Label>
				<Logo src="/logo-stpi.png" width={0.95} height={0.95} position={[-2.4, 0, 0]} />
				<Logo src="/logo-aws.png" width={1.25} height={1.25} position={[0, 0, 0]} />
				<Logo src="/logo-draper.png" width={1.45} height={0.85} position={[2.4, 0, 0]} />
			</group>
		</group>
	);
}
