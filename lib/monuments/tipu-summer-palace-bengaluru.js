// Tipu Sultan's Summer Palace, Bengaluru: sourced content for
// /monuments/tipu-summer-palace-bengaluru.
//
// Spec: docs/seo/monument-content-spec.md.
// Evidence: heritage_assets/tipu-summer-palace-bengaluru/research (palace-dimensions.json,
// palace-measurements.md, figure-*/evidence.md, figure-tipu/script-fact-trace.md).
//
// Where the ledger and the app or DB seed text differ, this page follows the ledger:
//   - Dates. Narration (migration 111), the lawn placard and the P0/P0b captions state
//     "Hyder Ali began it in 1781 ... completed 1791" as fact. palace-dimensions.json marks
//     construction_dates DISPUTED: ASI site board 1778-1789 vs secondary sources 1781-1791.
//     Both are given here, each with its source.
//   - Pillars. "Around a hundred and sixty" is a source claim (grid.pillars_total DISPUTED,
//     never counted). It is attributed and never written as a bare figure.
//   - Heights. Narration says the arch top is "about four and a half metres"; the ledger's
//     derivation is 4.62-4.91 m. This page uses the ledger range.
//   - The corner-room count ("four zenana rooms") is PARTLY_VERIFIED in the ledger and is
//     attributed to Wikipedia, not stated as fact.
// Not used: the_lost_colour.jpg and any Gemini output (ledger do_not_use); the 76
// attribution-bound corpus photographs are cited only through our internal evidence file.
// The name "Rashk-e-Jannat" appears in the app's seed text but in no public source we
// could verify, so it is not used as an alternate name.

const monument = {
  slug: "tipu-summer-palace-bengaluru",
  name: "Tipu Sultan's Summer Palace",
  alternateNames: ["Tipu Sultan's Palace"],
  city: "Bengaluru",
  region: "Karnataka",
  country: "IN",
  // Wikipedia's coordinates, as recorded in palace-dimensions.json meta.site_latlng.
  geo: { lat: 12.9594944, lng: 77.5735722 },
  wikidata: "Q7809034",
  live: true,
  updated: "2026-09-30",
  seo: {
    title: "Tipu Sultan's Summer Palace: how it looked originally",
    description:
      "What Tipu Sultan's Summer Palace in Bengaluru looked like: a two-storey teak palace, painted inside and out. Sourced, with the disputes and gaps named.",
  },

  // Answers: "What did Tipu Sultan's Summer Palace look like originally?"
  answer: [
    {
      text: "Tipu Sultan's Summer Palace was a long, low, two-storey building of teak on a stone platform, open along its fronts as colonnades of clustered pillars and cusped arches, with a galleried central hall inside that rises the full height of the building.",
      cite: ["wikipedia", "pm"],
      tier: "confirmed",
    },
    {
      text: "A watercolour made by Lieutenant James Hunter in February 1792 shows the outside colonnade painted in pale grounds with a blue-green trellis pattern, arches outlined in salmon-red and pillars fluted in green and gold, while the painting that survives inside is a floral pattern on a brick-red ground.",
      cite: ["hunter", "pm"],
      tier: "confirmed",
    },
    {
      text: "No measured drawing of the building exists in any source we could reach, so its exact dimensions, and what was painted in each room, are not recorded.",
      cite: ["pm"],
      tier: "unrecorded",
    },
  ],

  sections: [
    {
      id: "what-it-was",
      heading: "What it was",
      paragraphs: [
        {
          text: "The palace was built inside the walls of Bangalore Fort. Hyder Ali began it, and it was finished under his son, Tipu Sultan. The years it was begun and finished are disputed; both versions are set out below.",
          cite: ["wikipedia", "karnatakaGov", "asiBoard"],
          tier: "confirmed",
        },
        {
          text: "It is built of teak on a low stone platform, in two storeys. The teak shafts do not stand singly: they rise in clusters from shared stone bases, and the scalloped, or cusped, arches spring from their capitals.",
          cite: ["wikipedia", "pm"],
          tier: "confirmed",
        },
        {
          text: "Colin Mackenzie, an army engineer who surveyed the fort in March 1791, labelled this building \"Durbar, or Palace, of Tippoo Sultan\", and marked \"Water running round the Palace\". Wikipedia reports the belief that Tipu held court from the balconies on the east and west sides of the upper floor.",
          cite: ["mackenzie", "pm", "wikipedia"],
          tier: "source",
        },
        {
          text: "On the ground floor, an open, shaded colonnade runs the length of the building, and the same arcade appears on both long fronts. Upstairs, galleries with turned-timber balustrades look down into the central hall. Some of its pillars run straight past the gallery to the flat timber ceiling, while the pillars at the gallery edge stop at the first floor. Stairs of stone treads set into the wall, with timber balustrades, lead up.",
          cite: ["pm", "onmanorama"],
          tier: "confirmed",
        },
        {
          text: "The main front has five bays between six pillars. We counted this in six separate photographs. The front is not symmetrical: a narrow plain pier stands at one end and a solid two-storey block at the other.",
          cite: ["pm"],
          tier: "confirmed",
        },
        {
          text: "It is lower than \"two storeys\" suggests. From photographs with people standing at the front of the colonnade, we estimate the arch tops at about 4.6 to 4.9 metres above the floor, the eaves at about 5.5 to 5.8 metres and the top of the pierced parapet at about 6.8 to 7.3 metres. They rest on an assumed human height.",
          cite: ["pm"],
          tier: "estimate",
        },
        {
          text: "An early dated view of the inside also survives: the colonnade with figures, drawn by Robert Home and published in 1794.",
          cite: ["hunter", "home", "pm"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "what-survives",
      heading: "What survives",
      paragraphs: [
        {
          text: "The building still stands. It is a protected monument of national importance, maintained by the Archaeological Survey of India (ASI).",
          cite: ["wikidata", "wikipedia", "karnatakaGov"],
          tier: "confirmed",
        },
        {
          text: "The teak pillars, arches, galleries and balconies survive. Today the shafts are dark polished timber with pale capitals and lotus-collar bases. A balcony photographed close up sits on carved timber brackets, with a front of turned balusters under a cusped arch.",
          cite: ["pm"],
          tier: "confirmed",
        },
        {
          text: "Inside, parts of the wall painting survive: a brick-red ground covered in a pale floral pattern, bordered by a frieze of gold flowers and leaves on white, with fine black outlining.",
          cite: ["pm", "wikipedia"],
          tier: "confirmed",
        },
        {
          text: "The ground-floor rooms have been turned into a small museum, and the enclosed block at the south-south-west end now holds its gallery.",
          cite: ["wikipedia", "pm"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "what-is-gone",
      heading: "What is gone",
      paragraphs: [
        {
          text: "The outside colour is gone. Hunter's watercolour, inscribed \"A View of Tippoos Palace at Bangalore Feby. 92.\", was made eleven months after the fort fell. It shows pale walls carrying a blue-green trellis below and scattered blue-green sprigs above; arches outlined in salmon-red with an ochre inner line; shafts fluted alternately green and gold; gold capitals with red details; red bases; an ochre-and-red gallery balustrade; and a white pierced parapet along the roof.",
          cite: ["hunter", "pm"],
          tier: "confirmed",
        },
        {
          text: "Hunter's sheet records one outside face in 1792, not the rooms. The red interior and the pale exterior are two schemes on two surfaces, not a conflict between sources.",
          cite: ["hunter", "pm"],
          tier: "confirmed",
        },
        {
          text: "Most of the interior painting is gone. The surviving fragments show the style (red ground, pale floral field, gold border, black outline) but not what was painted where. No source we could reach, from the period or since, records the painting room by room.",
          cite: ["pm"],
          tier: "unrecorded",
        },
      ],
    },
    {
      id: "reconstruction",
      heading: "What Epocheye shows, and from what",
      paragraphs: [
        {
          text: "In the Epocheye app the palace opens as a 3D reconstruction on the phone screen. You look around by moving the phone, tap to jump between set standing points, and can walk the ground colonnade, the stairs and the first-floor gallery with an on-screen control. It can be opened away from the site.",
          cite: ["epocheyeApp"],
          tier: "confirmed",
        },
        {
          text: "The shape comes from the standing building: the five-bay front, the clustered pillars, the galleries and the full-height hall. Lengths and heights are our estimates scaled from photographs, because no survey has been published.",
          cite: ["pm", "epocheyeApp"],
          tier: "estimate",
        },
        {
          text: "The outside colonnade is painted as Hunter recorded it in February 1792, and the inside walls carry the red-ground floral style of the surviving fragments. Because no record says what was painted in each room, the pattern on the walls and ceilings follows the style of the Daria Daulat Bagh at Srirangapatna, another palace of Tipu Sultan's whose wall paintings survive. It is a reconstruction of the style, not a copy of these rooms.",
          cite: ["hunter", "pm", "ddb", "epocheyeApp"],
          tier: "estimate",
        },
        {
          text: "Figures of the period stand in the reconstruction, including Hyder Ali, Tipu Sultan and his finance minister Purnaiah. They are depictions drawn from period portraits and paintings, not likenesses. The app says so once, at the start of the tour, and says that its storytelling is generated by AI.",
          cite: ["epocheyeApp"],
          tier: "confirmed",
        },
        {
          text: "Boards placed inside the reconstruction explain the building as you walk, and a guided narration is recorded in English and Hindi. The tiger throne in the hall is the one object the app itself calls an imagining rather than a reconstruction: it never stood in this building. The boards do not mark which details are estimates; this page sets out that evidence.",
          cite: ["epocheyeApp"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "disputed",
      heading: "Where the sources disagree",
      paragraphs: [
        {
          text: "The construction dates are disputed. The ASI's name-board at the site gives 1778 to 1789. Wikipedia and most secondary sources say Hyder Ali began the palace in 1781 and Tipu Sultan completed it in 1791; the Karnataka government's Bengaluru Urban district site also gives 1791 for its completion. This page does not choose between them.",
          cite: ["asiBoard", "wikipedia", "karnatakaGov", "pm"],
          tier: "disputed",
        },
        {
          text: "On either chronology, Hyder Ali did not see it finished: he died in December 1782.",
          cite: ["hyderAli", "asiBoard", "wikipedia"],
          tier: "confirmed",
        },
        {
          text: "The Epocheye app's narration and boards follow the 1781 to 1791 dates. The ASI's board at the site gives different years.",
          cite: ["epocheyeApp", "asiBoard"],
          tier: "disputed",
        },
        {
          text: "Published descriptions, such as a 2019 Onmanorama travel feature, give the palace around a hundred and sixty pillars. We have not counted them, and no source we could reach lists them rank by rank. The pillar grid in photographs is consistent with it, but it remains a reported number.",
          cite: ["onmanorama", "pm"],
          tier: "disputed",
        },
      ],
    },
  ],

  unknowns: [
    {
      text: "No measured drawing of this building exists in any source we could reach.",
      cite: ["pm"],
    },
    {
      text: "The size of each room is not recorded. Nor are how far the balconies project, how wide they are or how high their sills stand, or the height and number of the stair steps and the length of each flight.",
      cite: ["pm"],
    },
    {
      text: "Which pillars run the full height of the building, and which stop at the first floor, is not recorded. Photographs show that some do each, but not how many.",
      cite: ["pm"],
    },
    {
      text: "How many rows of pillars stand behind each face is not recorded, because no photograph we found looks along a short side of the building.",
      cite: ["pm"],
    },
    {
      text: "Wikipedia describes four small corner rooms on the first floor as the zenana, the women's quarters. Corner rooms are visible in photographs, but that there are exactly four, their sizes and their use are not confirmed.",
      cite: ["wikipedia", "pm"],
    },
    {
      text: "What was painted in each room is not recorded. Whether any painted canvas survives on the wooden ceilings is also unknown: no photograph we examined shows it.",
      cite: ["pm"],
    },
  ],

  experience: {
    summary:
      "A 3D reconstruction of the palace as it was painted, which you can look around by moving the phone, jump through by tapping, and walk with an on-screen control. It works away from the site. Figures of the period stand in the rooms, boards inside the model explain what you see, and a guided narration is recorded in English and Hindi. The figures are depictions, and the room-by-room painting is a reconstruction of the style.",
    cite: [],
  },

  faq: [
    {
      q: "When was Tipu Sultan's Summer Palace built?",
      a: {
        text: "The sources disagree. The ASI's name-board at the site gives 1778 to 1789. Wikipedia and most secondary sources say Hyder Ali began it in 1781 and Tipu Sultan completed it in 1791.",
        cite: ["asiBoard", "wikipedia"],
        tier: "disputed",
      },
    },
    {
      q: "How many pillars does Tipu Sultan's Summer Palace have?",
      a: {
        text: "Published descriptions give around a hundred and sixty. That number has not been independently counted, and no source we could reach lists the pillars row by row.",
        cite: ["onmanorama", "pm"],
        tier: "disputed",
      },
    },
    {
      q: "What colour was Tipu Sultan's Summer Palace originally?",
      a: {
        text: "In February 1792 James Hunter painted its outside colonnade with pale grounds, a blue-green trellis, salmon-red arch outlines, green-and-gold fluted pillars and a white pierced parapet. Inside, the surviving painting is a pale floral pattern on a brick-red ground with a gold border.",
        cite: ["hunter", "pm"],
        tier: "confirmed",
      },
    },
    {
      q: "How big is Tipu Sultan's Summer Palace?",
      a: {
        text: "No measured drawing exists in any source we could reach. Our estimates from satellite imagery, a volunteer map outline and photographs disagree, so we give a range: the main front is about 29 to 35 metres long. The eaves stand about 5.5 to 5.8 metres above the floor.",
        cite: ["pm"],
        tier: "estimate",
      },
    },
  ],

  sources: {
    hunter: {
      name: "Lieutenant James Hunter, Tipu Sultan's Summer Palace, watercolour, 1792 (inscribed \"A View of Tippoos Palace at Bangalore Feby. 92.\")",
      publisher: "Yale Center for British Art, B1974.12.1168 (CC0)",
      url: "https://collections.britishart.yale.edu/catalog/tms:11802",
    },
    home: {
      name: "Robert Home, Inside View of the Palace at Bangalore, 1794",
      publisher: "Los Angeles County Museum of Art, M.73.14.13, via Wikimedia Commons",
      url: "https://commons.wikimedia.org/wiki/File:Inside_View_of_the_Palace_at_Bangalore_LACMA_M.73.14.13.jpg",
    },
    mackenzie: {
      name: "Colin Mackenzie, survey of the fort and petta of Bangalore, March 1791 (RCIN 735001)",
      publisher: "Royal Collection Trust",
      url: "https://www.rct.uk/collection/735001",
    },
    asiBoard: {
      name: "ASI name-board at the palace (photographed 2019)",
      publisher: "Archaeological Survey of India; photograph by Dolon Prova on Wikimedia Commons",
      url: "https://commons.wikimedia.org/wiki/File:Tipu_Sultans_Palace.jpg",
      onSite: "The ASI's name-board at the entrance to the palace, Chamrajpet, Bengaluru",
    },
    wikidata: {
      name: "Tipu Sultan's Summer Palace (Q7809034): heritage designation",
      publisher: "Wikidata",
      url: "https://www.wikidata.org/wiki/Q7809034",
    },
    karnatakaGov: {
      name: "Tipu Sultan's Summer Palace",
      publisher: "Bengaluru Urban district, Government of Karnataka",
      url: "https://bengaluruurban.nic.in/en/tourist-place/tipu-sultans-summer-palace/",
    },
    wikipedia: {
      name: "Tipu Sultan's Summer Palace (tertiary source)",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Tipu_Sultan%27s_Summer_Palace",
    },
    hyderAli: {
      name: "Hyder Ali (tertiary source)",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Hyder_Ali",
    },
    onmanorama: {
      name: "Tipu Sultan's grandiose Bangalore Fort and Summer Palace (travel feature, 2019)",
      publisher: "Onmanorama",
      url: "https://www.onmanorama.com/travel/outside-kerala/2019/12/21/tipu-sultan-bangalore-fort-summer-palace.html",
    },
    ddb: {
      name: "Daria Daulat Bagh (tertiary source)",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Daria_Daulat_Bagh",
    },
    pm: {
      name: "Palace measurements and evidence file",
      publisher: "Epocheye research",
      url: null,
      onSite: null,
      internal: true,
    },
    epocheyeApp: {
      name: "Epocheye app: palace reconstruction, placards and narration",
      publisher: "Epocheye Private Limited",
      url: null,
      onSite: null,
      internal: true,
    },
  },
};

export default monument;
