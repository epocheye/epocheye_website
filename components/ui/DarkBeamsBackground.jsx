"use client";

import dynamic from "next/dynamic";

const Beams = dynamic(() => import("@/components/Beams"), {
	ssr: false,
});

const DarkBeamsBackground = ({ opacity = 0.26, scrimOpacity = 0.52, beamProps = {} }) => {
	return (
		<>
			<div
				className="absolute inset-0 pointer-events-none"
				style={{ opacity }}
				aria-hidden="true">
				<Beams
					beamWidth={1.8}
					beamHeight={18}
					beamNumber={10}
					lightColor="#ffffff"
					speed={0.6}
					noiseIntensity={0.85}
					scale={0.24}
					rotation={-12}
					{...beamProps}
				/>
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
