import { connection } from "next/server";
import "./play.css";
import PlayArrival from "@/components/play/PlayArrival";
import { PlayFeaturesProvider } from "@/components/play/PlayFeatures";
import { playFeatures } from "@/lib/play/features";

// Not linked from the nav, the footer or the sitemap yet, and kept out of search until launch.
export const metadata = {
	title: "Epocheye Play",
	description: "Rebuild a lost monument from its evidence.",
	robots: { index: false, follow: false },
};

// The feature switches are read on every request (lib/play/features.js), so no Play page is
// built ahead of time with an old setting. data-play-analytics tells lib/play/api.js, before any
// script runs, whether analytics events may be sent at all.
export default async function PlayLayout({ children }) {
	await connection();
	const features = playFeatures();
	return (
		<div className="play" data-play-analytics={features.analytics ? "on" : "off"}>
			<PlayFeaturesProvider value={features}>
				{features.enabled ? <PlayArrival /> : null}
				{children}
			</PlayFeaturesProvider>
		</div>
	);
}
