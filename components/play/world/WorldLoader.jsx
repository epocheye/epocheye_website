"use client";

import dynamic from "next/dynamic";

// The game needs the browser and carries the 3D engine, so it loads only on this route.
const WorldGame = dynamic(() => import("@/components/play/world/WorldGame"), {
	ssr: false,
	loading: () => (
		<main style={{ position: "fixed", inset: 0, display: "grid", placeContent: "center", background: "#150b18", color: "#fff" }}>
			<p role="status">Loading the world</p>
		</main>
	),
});

export default function WorldLoader(props) {
	return <WorldGame {...props} />;
}
