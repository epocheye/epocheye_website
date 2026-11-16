import LegalPage from "@/components/journeys/LegalPage";

export const metadata = {
	title: "Terms | Epocheye Journeys",
	robots: { index: false, follow: false },
};

export default function JourneysTerms() {
	return (
		<LegalPage
			title="Terms"
			intro="These terms cover reservations and purchases of Epocheye virtual walks sold on this page by Epocheye Private Limited, India. [SAMBIT: legal review]"
			sections={[
				{
					h: "Reservations",
					p: [
						"A reservation holds a founding spot for one monument walk. Until checkout opens, no payment is taken. [SAMBIT: legal review]",
					],
				},
				{
					h: "Access",
					p: ["Your private link arrives by email on opening day and works in any modern browser. [SAMBIT: legal review]"],
				},
				{
					h: "Governing law",
					p: ["[SAMBIT: legal review]"],
				},
			]}
		/>
	);
}
