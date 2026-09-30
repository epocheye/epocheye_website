import Image from "next/image";
import googlePlayBadge from "@/public/google-play-badge.png";
import { PLAY_STORE_URL } from "@/lib/site";

export default function PlayCta({ label }) {
	return (
		<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
			<span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium tracking-wide text-white/80 backdrop-blur-sm">
				{label}
			</span>
			<a
				href={PLAY_STORE_URL}
				target="_blank"
				rel="noopener"
				aria-label="Get Epocheye on Google Play"
				className="inline-flex rounded-lg transition-opacity duration-300 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/50">
				<Image src={googlePlayBadge} alt="Get it on Google Play" width={170} height={65} className="h-[52px] w-auto" />
			</a>
		</div>
	);
}
