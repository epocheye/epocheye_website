import Link from "next/link";
import UnlockRestore from "@/components/play/sites/UnlockRestore";
import PlayOff from "@/components/play/sites/PlayOff";
import { playFeatures } from "@/lib/play/features";
import "@/components/play/sites/community.css";

// The token is in the address: never send it on to another site.
export const metadata = { title: "Your Epocheye Play link", referrer: "no-referrer", robots: { index: false, follow: false } };

// /play/unlock#t=<signed link>  The link from a Play email.
// The token rides in the fragment, which the browser never sends to any server, and the page
// takes it out of the address bar before anything else reads it (UnlockRestore). Opening the page
// changes nothing: confirming the address is a tap (a POST), and moving the player onto this
// device is a second tap, so a mail scanner that fetches the link confirms and moves nothing.
// With email switched off (lib/play/features.js) the link does nothing; stopping emails
// (/play/unlock/stop) always works.
export default function PlayUnlockPage() {
	const features = playFeatures();
	if (!features.enabled) return <PlayOff />;
	if (!features.email) return <PlayOff title="This email link is not available right now" />;
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
			</div>
			<UnlockRestore />
		</main>
	);
}
