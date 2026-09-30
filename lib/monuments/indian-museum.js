// Indian Museum, Kolkata. Follows docs/seo/monument-content-spec.md.
//
// Evidence base, stated so the next editor does not widen it by accident:
// - Object claims: the production object_claims rows for monument_id 'indian-museum'
//   (all from museumsofindia.gov.in/repository/, tier 1, one independence group),
//   each quote verified against the fetched page by the research harvester.
// - Institutional history: the Museums of India venue page (tier 1, fetched and read)
//   and Wikipedia (tier 4, labelled tertiary). indianmuseumkolkata.org refused our
//   requests (HTTP 403), so nothing is taken from it directly.
// - Gallery placards: the museum's own labels, photographed on 30 May 2026.
// - Migration 045's knowledge_text is untiered draft and is NOT used as a source.
//   Claims that appear only there (the mummy's age, "Italianate", the bull capital
//   in Rashtrapati Bhavan, "grey schist") are left out.
//
// Tiering: the catalogue and the placards both come from the museum, so they are one
// source, not two. Nothing here reaches "confirmed" except statements about our own app.

const MOI = "Museums of India: National Portal and Digital Repository, Ministry of Culture";

const monument = {
	slug: "indian-museum",
	name: "Indian Museum",
	alternateNames: [],
	city: "Kolkata",
	region: "West Bengal",
	country: "IN",
	geo: { lat: 22.5577, lng: 88.3511 },
	wikidata: "Q1364900",
	live: true,
	updated: "2026-09-30",
	seo: {
		title: "Indian Museum, Kolkata: history and sourced records",
		description:
			"The Indian Museum in Kolkata, founded in 1814 at the Asiatic Society of Bengal. What the sources record, what they don't, and what Epocheye shows.",
	},
	answer: [
		{
			text: "The Indian Museum is a museum on Jawaharlal Nehru Road, in the Park Street area of Kolkata. The Museums of India portal, run under the Ministry of Culture, says it was founded in 1814 at the Asiatic Society of Bengal, and describes it as the earliest and largest multipurpose museum in the Indian subcontinent and the Asia-Pacific region.",
			cite: ["moiVenue"],
			tier: "source",
		},
		{
			text: "According to Wikipedia, a tertiary source, its present building was completed in 1875 to a design by W L Granville.",
			cite: ["wp"],
			tier: "source",
		},
	],
	sections: [
		{
			id: "what-it-was",
			heading: "How the museum began",
			paragraphs: [
				{
					text: "According to the Museums of India portal, Sir William Jones founded the Asiatic Society in Kolkata in 1784. In 1796 its members conceived the idea of a museum to receive and keep objects made by people or produced by nature. The idea took shape in 1808, when the Society occupied premises at the corner of Park Street, on land granted by the Government.",
					cite: ["moiVenue"],
					tier: "source",
				},
				{
					text: "The portal gives 1814 as the founding year, with the museum housed in what is now the Asiatic Society's building at 1 Park Street.",
					cite: ["moiVenue"],
					tier: "source",
				},
				{
					text: "Wikipedia adds that on 2 February 1814 Nathaniel Wallich, a Danish botanist, wrote to the Society's council proposing a museum and offering to serve as its curator. It also records that the first Indian Museum Act was passed in 1866, that the foundation at the present site was laid in 1867, and that the present building, on what was then Chowringhee Road, was completed in 1875 to a design by W L Granville. We have not checked these dates against a primary source, so they are given here as Wikipedia's account.",
					cite: ["wp"],
					tier: "source",
				},
			],
		},
		{
			id: "what-survives",
			heading: "What the museum's own records describe",
			paragraphs: [
				{
					text: "The museum's catalogue record for its Lion Capital gives the provenance as Rampurwa, Bihar, and a date of about the 3rd century BCE. It describes a single lion on an abacus decorated with a line of geese, above a bell-shaped inverted lotus, and says the capital still keeps its high lustrous polish in places.",
					cite: ["moiLion"],
					tier: "source",
				},
				{
					text: "Wikipedia says the museum also holds a copy of the Lion Capital of Ashoka, whose original is in the Sarnath Museum. That is a different object from the Rampurwa capital.",
					cite: ["wp"],
					tier: "source",
				},
				{
					text: "Records for sculpture from the north-west of the subcontinent include a Preaching Buddha and a seated Bodhisattva, both from Loriyan Tangai and both dated to about the 2nd century CE. The catalogue says the Buddha holds his hands in the vyakhyana mudra, the preaching gesture, and describes the Bodhisattva as having typical Gandharan features.",
					cite: ["moiPreaching", "moiBodhisattva"],
					tier: "source",
				},
				{
					text: "Two bronzes, a Nataraja and a Somaskanda group of Siva, Parvati and Skanda, are each dated to about the 13th century CE. The catalogue gives Chennai, Tamil Nadu, as the origin of both.",
					cite: ["moiNataraja", "moiSomaskanda"],
					tier: "source",
				},
				{
					text: "From eastern India, the catalogue records a standing Avalokitesvara from Lalitagiri, Orissa, dated to about the 10th century CE, whose left forearm is broken. It also records a Khadiravani Tara whose pedestal inscription names the second year of King Ramapala.",
					cite: ["moiAvalokitesvara", "moiTara"],
					tier: "source",
				},
				{
					text: "The placards in the galleries carry the museum's own wording and accession numbers. A sandstone relief of scenes from the life of the Buddha (S. 60/A24175) is labelled as from Sarnath, about the 6th century CE. A basalt votive stupa (BG41/A24212) is labelled as from Bodhgaya, about the 11th century CE.",
					cite: ["labels"],
					tier: "source",
				},
				{
					text: "Wikipedia lists the railings and gateways of the Bharhut stupa, remains of the Amaravati stupa and an Egyptian mummy among the collection. None of these has a catalogue record in the app's research so far, so the app has nothing sourced to show for them yet.",
					cite: ["wp", "app"],
					tier: "source",
				},
			],
		},
		{
			id: "reconstruction",
			heading: "What Epocheye shows, and from what",
			paragraphs: [
				{
					text: "Epocheye does not reconstruct the museum building. There is no 3D model of it and no view of how it once looked.",
					cite: ["app"],
					tier: "confirmed",
				},
				{
					text: "Inside the museum, the app recognises an object from the camera, or reads the accession number on its placard, and places cards beside it. Each card holds one claim. A line above the claim names the evidence tier and the source, and the card links to the source's page. At this museum those sources are, so far, the Museums of India catalogue records.",
					cite: ["app", "moiLion"],
					tier: "confirmed",
				},
				{
					text: "When the app finds no record, it says so in these words: “No published record of this object was found in the sources this app is allowed to cite. That is a statement about the search, not about the object.”",
					cite: ["app"],
					tier: "confirmed",
				},
				{
					text: "The app marks a museum catalogue claim as confirmed on its card, and shows a lead card saying when everything rests on one source. This page is stricter. The catalogue and the placards both come from the museum, so a claim backed only by them is marked here as single source.",
					cite: ["app", "labels"],
					tier: "confirmed",
				},
			],
		},
		{
			id: "disputed",
			heading: "Where the sources disagree",
			paragraphs: [
				{
					text: "We found no disagreement between the sources on the points this page uses. That is mostly because most points rest on a single source. Wikipedia's account of the founding cites the museum's own website, so where it agrees with the Museums of India portal on 1808 and 1814, that is not independent confirmation.",
					cite: ["moiVenue", "wp"],
					tier: "source",
				},
				{
					text: "For the relief from Sarnath and the votive stupa from Bodhgaya, the placards and the online catalogue give the same place and century. Both come from the museum, so this page does not count them as two sources.",
					cite: ["labels", "moiScenes", "moiStupa"],
					tier: "source",
				},
			],
		},
	],
	unknowns: [
		{
			text: "No museum or government record for the Egyptian mummy, the Bharhut railings or the Amaravati sculptures has been checked for this page. Wikipedia is the only source here that mentions them.",
			cite: ["wp"],
		},
		{
			text: "No primary source we could reach records when the present building was designed or built. The 1866, 1867 and 1875 dates on this page come from Wikipedia alone.",
			cite: ["wp"],
		},
		{
			text: "The museum's own website could not be read for this page, so the institutional history rests on the Museums of India portal and Wikipedia.",
			cite: ["moiVenue", "wp"],
		},
		{
			text: "Most objects on display have no online record the app is allowed to cite. For those, the app shows its empty state rather than a guess.",
			cite: ["app"],
		},
	],
	experience: {
		summary:
			"At the Indian Museum, Epocheye recognises objects from the camera, or from the accession number on a placard, and shows cards beside them. Each card holds one sourced claim and names its source. There is no reconstruction of the building. Where no record exists, the app says so.",
		cite: [],
	},
	faq: [
		{
			q: "When was the Indian Museum in Kolkata founded?",
			a: {
				text: "The Museums of India portal gives 1814, at the Asiatic Society of Bengal's building on Park Street.",
				cite: ["moiVenue"],
				tier: "source",
			},
		},
		{
			q: "Who designed the present Indian Museum building?",
			a: {
				text: "According to Wikipedia, a tertiary source, the present building was designed by W L Granville and completed in 1875. We have not checked this against a primary source.",
				cite: ["wp"],
				tier: "source",
			},
		},
		{
			q: "Is the Rampurwa lion capital at the Indian Museum?",
			a: {
				text: "The museum's catalogue has a record for a Lion Capital from Rampurwa, Bihar, dated to about the 3rd century BCE.",
				cite: ["moiLion"],
				tier: "source",
			},
		},
	],
	sources: {
		moiVenue: {
			name: "Indian Museum, Kolkata: museum page",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/museum/im_kol",
		},
		moiLion: {
			name: "Lion Capital, catalogue record A24800",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-6298-6299-A24800-10379",
		},
		moiPreaching: {
			name: "Preaching Buddha, catalogue record 4838/A23230",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-4838-A23230-10359",
		},
		moiBodhisattva: {
			name: "Bodhisattva, catalogue record 4993/A23527",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-4993-A23527-10368",
		},
		moiNataraja: {
			name: "Nataraja, catalogue record 11000/A9983",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-11000-A9983-10357",
		},
		moiSomaskanda: {
			name: "Somaskanda, catalogue record 11001/A9981",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-11001-A9981-10356",
		},
		moiAvalokitesvara: {
			name: "Avalokitesvara, catalogue record 6954/A24136",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-6954-A24136-10365",
		},
		moiTara: {
			name: "Khadiravani Tara, catalogue record 3824/A25158",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-3824-A25158-10410",
		},
		moiScenes: {
			name: "Scenes from the life of Buddha, catalogue record S60/A24175",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-S60-A24175-33121",
		},
		moiStupa: {
			name: "Votive Stupa, catalogue record BG41/A24212",
			publisher: MOI,
			url: "https://museumsofindia.gov.in/repository/record/im_kol-BG41-A24212-33115",
		},
		labels: {
			name: "Indian Museum gallery labels",
			publisher: "Indian Museum, Kolkata",
			url: null,
			onSite: "Printed placards beside each object in the museum's galleries, with accession numbers; read on 30 May 2026",
		},
		wp: {
			name: "Wikipedia, “Indian Museum” (tertiary source)",
			publisher: "Wikipedia",
			url: "https://en.wikipedia.org/wiki/Indian_Museum",
		},
		app: {
			name: "Epocheye app: Lens cards and museum scan flow",
			publisher: "Epocheye research",
			url: null,
			onSite: null,
			internal: true,
		},
	},
};

export default monument;
