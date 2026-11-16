import LegalPage from "@/components/journeys/LegalPage";

export const metadata = {
	title: "Privacy | Epocheye Journeys",
	robots: { index: false, follow: false },
};

export default function JourneysPrivacy() {
	return (
		<LegalPage
			title="Privacy"
			intro="What we collect on this page and why. [SAMBIT: legal review]"
			sections={[
				{
					h: "What we store",
					p: [
						"Your email address, the monument and walk you chose, and which version of this page you saw. We use it to email you before your walk opens. [SAMBIT: legal review]",
					],
				},
				{
					h: "Analytics",
					p: ["Cookieless page analytics only. No advertising trackers. [SAMBIT: legal review]"],
				},
				{
					h: "Your rights",
					p: ["Email us to see or delete what we hold about you. [SAMBIT: legal review]"],
				},
			]}
		/>
	);
}
