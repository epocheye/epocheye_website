import LegalPage from "@/components/journeys/LegalPage";

export const metadata = {
	title: "Refunds | Epocheye Journeys",
	robots: { index: false, follow: false },
};

export default function JourneysRefunds() {
	return (
		<LegalPage
			title="Refunds"
			intro="The refund promise on the page, written out. [SAMBIT: legal review]"
			sections={[
				{
					h: "Before it opens",
					p: ["Change your mind before your walk opens and you get a full refund, one click. [SAMBIT: legal review]"],
				},
				{
					h: "If we miss the date",
					p: ["If a walk does not open on the date you reserved for, we refund you automatically. [SAMBIT: legal review]"],
				},
				{
					h: "After you walk it",
					p: ["Walked it and did not love it: full refund within 7 days of opening day. [SAMBIT: legal review]"],
				},
			]}
		/>
	);
}
