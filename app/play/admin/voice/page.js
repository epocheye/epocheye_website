import { redirect } from "next/navigation";
import { verifyAdminJWT } from "@/lib/server/adminAuth";
import { SITES } from "@/lib/play/sites";
import VoiceReview from "@/components/play/VoiceReview";

export const metadata = { title: "Voice review | Epocheye Play", robots: { index: false, follow: false } };

// Behind the same admin check as /admin. Not signed in: go to the admin login.
export default async function VoiceReviewPage() {
	const auth = await verifyAdminJWT();
	if (!auth.ok) redirect("/admin/login");
	const dev = process.env.NODE_ENV !== "production";
	const sites = SITES.filter((s) => s.version && (s.status === "live" || (dev && s.status === "dev"))).map(({ slug, version, name }) => ({ slug, version, name }));
	return <VoiceReview sites={sites} />;
}
