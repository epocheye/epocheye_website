import "./play.css";
import PlayArrival from "@/components/play/PlayArrival";

// Not linked from the nav, the footer or the sitemap yet, and kept out of search until launch.
export const metadata = {
	title: "Epocheye Play",
	description: "Rebuild a lost monument from its evidence.",
	robots: { index: false, follow: false },
};

export default function PlayLayout({ children }) {
	return (
		<div className="play">
			<PlayArrival />
			{children}
		</div>
	);
}
