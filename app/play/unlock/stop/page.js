import Link from "next/link";
import UnsubscribeForm from "@/components/play/sites/UnsubscribeForm";
import "@/components/play/sites/community.css";

export const metadata = { title: "Stop Play emails | Epocheye Play", referrer: "no-referrer", robots: { index: false, follow: false } };

// /play/unlock/stop#t=<signed link>  The unsubscribe link in every Play email. The token rides in
// the fragment and the form takes it out of the address bar on arrival. Stopping is one tap on
// this page (a POST), so a mail scanner that fetches the link changes nothing.
export default function PlayUnsubscribePage() {
	return (
		<main className="play-page">
			<div className="play-home-bar">
				<Link href="/play" className="play-brand">
					Epocheye Play
				</Link>
			</div>
			<header className="play-page-head">
				<h1>Stop Play emails</h1>
			</header>
			<section className="play-page-section">
				<UnsubscribeForm />
			</section>
		</main>
	);
}
