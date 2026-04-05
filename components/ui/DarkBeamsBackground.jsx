"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Beams = dynamic(() => import("@/components/Beams"), {
	ssr: false,
});

const DarkBeamsBackground = ({ opacity = 0.26, scrimOpacity = 0.52, beamProps = {} }) => {
	const [shouldRenderBeams, setShouldRenderBeams] = useState(false);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
		if (prefersReducedMotion) return;

		const saveData = navigator.connection?.saveData;
		if (saveData) return;

		const enable = () => setShouldRenderBeams(true);
		const idleId = window.requestIdleCallback?.(enable, { timeout: 1200 });
		const fallbackTimer = window.setTimeout(enable, 1200);

		return () => {
			if (idleId && window.cancelIdleCallback) {
				window.cancelIdleCallback(idleId);
			}
			window.clearTimeout(fallbackTimer);
		};
	}, []);

	return (
		<>
			<div
				className="absolute inset-0 pointer-events-none"
				style={{ opacity }}
				aria-hidden="true">
				{shouldRenderBeams ? (
					<Beams
						beamWidth={1.8}
						beamHeight={18}
						beamNumber={10}
						lightColor="#f5fbff"
						speed={0.6}
						noiseIntensity={0.62}
						scale={0.24}
						rotation={-12}
						{...beamProps}
					/>
				) : null}
			</div>
			<div
				className="absolute inset-0 pointer-events-none bg-black"
				style={{ opacity: scrimOpacity }}
				aria-hidden="true"
			/>
		</>
	);
};

export default DarkBeamsBackground;
