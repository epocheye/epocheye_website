// Bangalore Fort, Bengaluru. Follows docs/seo/monument-content-spec.md.
// Evidence basis: heritage_assets/bangalore-fort/research/evidence.md, phaseA-addendum.md
// (which supersedes evidence.md where marked), fabric-measured.md, georeference.md and
// MASTER-STATUS.md. Every url below was taken from those files or opened and checked on
// 2026-09-30. Period siege drawings are called "surveys" or "engraved maps" here, to keep
// clear of the banned-word list in the spec.
const monument = {
	slug: "bangalore-fort",
	name: "Bangalore Fort",
	alternateNames: ["Bengaluru Fort", "Old Dungeon Fort & Gates"],
	city: "Bengaluru",
	region: "Karnataka",
	country: "IN",
	geo: { lat: 12.962888, lng: 77.575938 },
	wikidata: "Q4855049",
	live: true,
	updated: "2026-09-30",
	seo: {
		title: "Bangalore Fort: what it looked like before demolition",
		description:
			"What Bangalore Fort in Bengaluru looked like in 1791, what survives at the Delhi Gate, what is gone, and what no source records. Every claim sourced.",
	},
	answer: [
		{
			text: "Bangalore Fort was an egg-shaped stone fortress, rebuilt in 1761, with a rampart 26 feet thick faced with stone over a core of red clay, round bastions, five raised gun platforms called cavaliers, a broad and mostly dry ditch, and only two gateways: the Delhi Gate to the north and the Mysore Gate to the south.",
			cite: ["rice", "cmack", "home", "rmack"],
			tier: "confirmed",
		},
		{
			text: "Today the Delhi Gate complex and a short stretch of adjoining wall and bastion survive; the rest of the circuit, its ditch and the Mysore Gate are gone.",
			cite: ["asiBoard", "wikipedia"],
			tier: "confirmed",
		},
		{
			text: "No source we could reach records the rampart's height in legible form, or any measurement of the Delhi Gate.",
			cite: ["cmack", "epocheye"],
			tier: "unrecorded",
		},
	],
	sections: [
		{
			id: "what-it-was",
			heading: "What it was",
			paragraphs: [
				{
					text: "According to B. Lewis Rice's gazetteer of 1897, the first fort here was of mud and is said to date from 1537, under Kempe Gowda.",
					cite: ["rice"],
					tier: "source",
				},
				{
					text: "The stone fort did not follow that older line. In 1800 Francis Buchanan saw the ruins of the old mud wall in the centre of the fort: a smaller enclosure inside the later walls.",
					cite: ["buchanan"],
					tier: "confirmed",
				},
				{
					text: "The fort was enlarged and rebuilt in stone in 1761, the first year of Hyder Ali's rule. Rice attributes the work to a killedar named Ibrahim Sahib; the Archaeological Survey of India (ASI) board at the site also gives 1761.",
					cite: ["rice", "asiBoard"],
					tier: "confirmed",
				},
				{
					text: "It was oval, with round towers at intervals. Roderick Mackenzie, writing in 1799, said it came closer to an egg, though it seemed designed as a true oval.",
					cite: ["home", "rice", "rmack"],
					tier: "confirmed",
				},
				{
					text: "Colin Mackenzie, who surveyed the fort for the British army in 1791, recorded the rampart as 26 feet thick and faced with stone. Robert Home, watching the siege guns, wrote that the facing fell quickly but the body of the rampart, of red clay, crumbled only slowly. A parapet five feet high and five feet thick ran along the top.",
					cite: ["cmack", "home", "rmack"],
					tier: "confirmed",
				},
				{
					text: "A lower outer wall, the fausse-braye, ran all round the foot of the rampart, with a covered way beyond it. Five cavaliers, raised gun platforms, overlooked the whole work.",
					cite: ["rmack", "cmack", "rice", "home"],
					tier: "confirmed",
				},
				{
					text: "Colin Mackenzie calls the moat the Great Ditch, 100 to 110 feet broad (the first figure is hard to read). Home found it deep and wide but dry in most parts, and Mackenzie marks a wet stretch. In March 1791 it was mostly dry, with water held in places.",
					cite: ["cmack", "home", "rmack"],
					tier: "confirmed",
				},
				{
					text: "There were two gateways. The Delhi Gate faced north towards the walled town; the Mysore Gate faced south. Home describes the Delhi Gate as five strong, large gates finished with considerable elegance, and the Mysore Gate as four lower, plainer ones.",
					cite: ["home", "rmack", "cmack", "vibart", "rice"],
					tier: "confirmed",
				},
				{
					text: "Colin Mackenzie's survey names the buildings inside, among them magazines, granaries and the Durbar, or Palace, of Tipu Sultan.",
					cite: ["cmack"],
					tier: "confirmed",
				},
				{
					text: "Measured by Epocheye against the scale bar of Home's engraved map of 1794, the rampart outline spans an estimated 680 by 510 yards (roughly 620 by 460 metres), to the tips of the bastions.",
					cite: ["homeMap", "epocheye"],
					tier: "estimate",
				},
				{
					text: "The British stormed the fort on the night of 21 March 1791. Colin Mackenzie's key separates a breach in the curtain wall from the breach in the great round tower through which the storming party entered. Vibart places the curtain breach near the large round tower, \"where the present gate stands\".",
					cite: ["cmack", "vibart"],
					tier: "confirmed",
				},
			],
		},
		{
			id: "what-survives",
			heading: "What survives",
			paragraphs: [
				{
					text: "According to the ASI's board, only this part of the fort remains intact: three successive gateways that linked the royal enclosure to the town, a dungeon and a small Ganesha temple, with sloping granite walls carrying stucco carving.",
					cite: ["asiBoard"],
					tier: "source",
				},
				{
					text: "A British tablet on the wall reads: \"Through this breach the British assault was delivered. March 21st 1791.\"",
					cite: ["plaque", "asiBoard"],
					tier: "confirmed",
				},
				{
					text: "The ASI's board also says a tablet in the dungeon records the confinement of Sir David Baird and other Englishmen before 1785. We have not found a second source for this.",
					cite: ["asiBoard"],
					tier: "source",
				},
				{
					text: "Measured from Epocheye's photographs of July 2026, the surviving wall leans back an estimated 7 degrees as it rises, and its joints show no pale mortar: they are the same stone, recessed and in shadow.",
					cite: ["epocheye"],
					tier: "estimate",
				},
			],
		},
		{
			id: "what-is-gone",
			heading: "What is gone",
			paragraphs: [
				{
					text: "Buchanan, in 1800, walked through what he called the ruins of the fort, and wrote that Tipu Sultan had pulled it down after seeing how poorly it held against the British.",
					cite: ["buchanan"],
					tier: "source",
				},
				{
					text: "Rice records that by 1897 the fort had become part of the city. The old winding entrance through seven gates had been given up some thirty years before for a straight entrance cut beside the Delhi Gate, and the walls had been opened for a road running east to west.",
					cite: ["rice"],
					tier: "source",
				},
				{
					text: "Beyond the Delhi Gate complex, the circuit, the ditch, the cavaliers and the Mysore Gate no longer stand.",
					cite: ["asiBoard", "wikipedia"],
					tier: "confirmed",
				},
				{
					text: "No source we could reach dates the removal of any particular stretch of wall after 1897.",
					cite: ["epocheye"],
					tier: "unrecorded",
				},
			],
		},
		{
			id: "reconstruction",
			heading: "What Epocheye shows, and from what",
			paragraphs: [
				{
					text: "The reconstruction rises from the surviving wall. Its thickness is Colin Mackenzie's 26 feet; its parapet is Roderick Mackenzie's five feet high and five feet thick.",
					cite: ["cmack", "rmack"],
					tier: "confirmed",
				},
				{
					text: "Mackenzie wrote the rampart's height on his survey, but at the best resolution we can obtain the figure cannot be read. So the rebuilt wall fades out above the surviving stone instead of ending at an invented top.",
					cite: ["cmack", "epocheye"],
					tier: "unrecorded",
				},
				{
					text: "The model's fit to the real wall rests on Epocheye's own site survey, and its scale is an estimate from that survey, not a recorded measurement.",
					cite: ["epocheye"],
					tier: "estimate",
				},
			],
		},
		{
			id: "disputed",
			heading: "Where the sources disagree",
			paragraphs: [
				{
					text: "Bastions: Robert Home (1794) gives about thirty. Roderick Mackenzie (1799) gives twenty-six circular bastions sixty-seven yards apart, plus smaller ones over each gateway. We do not choose between them.",
					cite: ["home", "rmack"],
					tier: "disputed",
				},
				{
					text: "Size: Home's text says somewhat more than nine hundred yards in the longest diameter, but his own engraved map measures about 680 yards along the rampart line. Our hypothesis, not established, is that his figure includes the outworks.",
					cite: ["home", "homeMap", "epocheye"],
					tier: "disputed",
				},
				{
					text: "This page gives no circuit length. \"About a kilometre around\" does not fit: an oval with a long axis of an estimated 620 metres or more cannot be less than about 1.2 kilometres round.",
					cite: ["homeMap", "epocheye"],
					tier: "estimate",
				},
				{
					text: "Gates: Home, both Mackenzies, Vibart and Rice give the fort two gateways. The ASI's board lists six, adding Yelahanka, Ulsoor, Kanakanahalli and Kengeri; those most likely belong to the surrounding town. Within the Delhi Gate, Home counts five gates, Rice seven in the old entrance, and three survive; these may reflect different periods.",
					cite: ["home", "rmack", "cmack", "vibart", "rice", "asiBoard"],
					tier: "disputed",
				},
			],
		},
	],
	unknowns: [
		{
			text: "The rampart's height: written on Colin Mackenzie's survey but illegible at the resolution available.",
			cite: ["cmack"],
		},
		{
			text: "Any measurement of the Delhi Gate: passage depth, opening height or width, wall thickness.",
			cite: ["epocheye"],
		},
		{
			text: "The diameter and position of any single bastion or cavalier, and the depth of the ditch.",
			cite: ["epocheye"],
		},
		{
			text: "The width of the 1791 breaches, and exactly where the British tablet sits on the wall.",
			cite: ["plaque", "epocheye"],
		},
		{
			text: "Which parts of the surviving wall are 18th-century and which are later repair.",
			cite: ["epocheye"],
		},
		{
			text: "Whether the palace Colin Mackenzie drew inside the fort is the building now called Tipu Sultan's Summer Palace.",
			cite: ["cmack", "epocheye"],
		},
	],
	experience: {
		summary:
			"At Bangalore Fort the app guides you to a marked standing spot beside the surviving wall, then fixes a reconstruction of the lost rampart onto the real stone using the phone's AR positioning. Twenty cards hang on the two surviving wall faces covering the 1791 breach, the rampart, the ditch and the gates, each with its evidence tier and source. Tap a card to read it, or tap the rampart or a bastion to name it. On a phone without AR support, the app offers the same card text in a non-AR viewer.",
		cite: [],
	},
	faq: [
		{
			q: "How many gates did Bangalore Fort have?",
			a: {
				text: "Two: the Delhi Gate to the north and the Mysore Gate to the south. The six gates on the ASI's board most likely include gates of the surrounding town.",
				cite: ["home", "rmack", "cmack", "rice", "asiBoard"],
				tier: "confirmed",
			},
		},
		{
			q: "How many bastions did Bangalore Fort have?",
			a: {
				text: "The sources disagree: Robert Home (1794) says about thirty; Roderick Mackenzie (1799) says twenty-six, plus smaller ones over the gateways.",
				cite: ["home", "rmack"],
				tier: "disputed",
			},
		},
		{
			q: "Where did the British break into Bangalore Fort?",
			a: {
				text: "At the Delhi Gate end, on the night of 21 March 1791, through a breach in the great round tower; a separate breach was made in the curtain wall. A British tablet on the surviving wall marks the breach.",
				cite: ["cmack", "vibart", "plaque"],
				tier: "confirmed",
			},
		},
		{
			q: "Was Sir David Baird held in the dungeon at Bangalore Fort?",
			a: {
				text: "The ASI's board says a tablet in the dungeon records his confinement, with other Englishmen, before 1785. We have not found a second source.",
				cite: ["asiBoard"],
				tier: "source",
			},
		},
		{
			q: "Was Tipu Sultan's palace inside Bangalore Fort?",
			a: {
				text: "Colin Mackenzie's 1791 survey marks the Durbar, or Palace, of Tipu Sultan inside the fort. Whether it is the building now called Tipu Sultan's Summer Palace is not established in our evidence.",
				cite: ["cmack", "epocheye"],
				tier: "source",
			},
		},
	],
	sources: {
		home: {
			name: "Robert Home, Select Views in Mysore, London, 1794, letterpress pp. 1–2 and 6",
			publisher: "Internet Archive (Digital Library of India scan)",
			url: "https://archive.org/details/in.ernet.dli.2015.530041",
		},
		homeMap: {
			name: "Robert Home, engraved map of Bangalore \"with the Attacks\", 22 March 1791",
			publisher: "Wikimedia Commons (public domain)",
			url: "https://commons.wikimedia.org/wiki/File:Plan_of_Bangalore_(with_the_Attacks)_taken_by_the_English_Army_under_the_Command_of_the_Rt._Honble._Earl_Cornwallis_-_March_22nd_1791.jpg",
		},
		cmack: {
			name: "Colin Mackenzie, survey of the fort and pettah of Bangalore, 1791, with its printed key",
			publisher: "Royal Collection Trust, RCIN 735001; public-domain copy on Wikimedia Commons",
			url: "https://commons.wikimedia.org/wiki/File:Bangalore_siege_map.jpg",
		},
		rmack: {
			name: "Roderick Mackenzie, A Sketch of the War with Tippoo Sultaun, vol. II, 1799, p. 43",
			publisher: "Internet Archive (Digital Library of India scan)",
			url: "https://archive.org/details/in.ernet.dli.2015.530296",
		},
		rice: {
			name: "B. Lewis Rice, Mysore: A Gazetteer Compiled for Government, rev. ed., vol. II, 1897, p. 46",
			publisher: "Internet Archive",
			url: "https://archive.org/details/mysoreagazettee00ricegoog",
		},
		buchanan: {
			name: "Francis Buchanan, A Journey from Madras through the Countries of Mysore, Canara, and Malabar, vol. I, 1807, pp. 44–46",
			publisher: "Internet Archive",
			url: "https://archive.org/details/journeyfrommadra01hami",
		},
		vibart: {
			name: "H. M. Vibart, The Military History of the Madras Engineers and Pioneers, vol. I, 1881, pp. 223–228",
			publisher: "Internet Archive",
			url: "https://archive.org/details/militaryhistoryo01viba",
		},
		asiBoard: {
			name: "Archaeological Survey of India, history board at Bangalore Fort (photograph, 2017)",
			publisher: "Wikimedia Commons, photograph by Ibrahim Husain Meraj (CC BY-SA 4.0)",
			url: "https://commons.wikimedia.org/wiki/File:History_board_of_Bangalore_fort_01.jpg",
			onSite: "The ASI interpretation board at the Delhi Gate complex.",
		},
		plaque: {
			name: "British tablet marking the 1791 breach (photograph, 2004)",
			publisher: "Wikimedia Commons, photograph by WestCoastMusketeer (CC BY-SA 4.0)",
			url: "https://commons.wikimedia.org/wiki/File:British_Plaque,_Bangalore_Fort.JPG",
			onSite: "Set into the surviving wall; its exact position is not recorded in any source we hold.",
		},
		wikipedia: {
			name: "Wikipedia, Bangalore Fort (tertiary source)",
			publisher: "Wikipedia",
			url: "https://en.wikipedia.org/wiki/Bangalore_Fort",
		},
		epocheye: {
			name: "Bangalore Fort evidence file, site photographs and measurements",
			publisher: "Epocheye research",
			url: null,
			onSite: null,
			internal: true,
		},
	},
};

export default monument;
