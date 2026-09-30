// Victoria Memorial Hall, Kolkata: sourced content for /monuments/victoria-memorial.
//
// Spec: docs/seo/monument-content-spec.md.
// Evidence: heritage_assets/victoria-memorial-kolkata/research (findings_history,
// findings_architecture, findings_interiors, disputes, blocklist B01-B08).
// Where the evidence ledger and DB seed migration 040 differ ("56 metres",
// "1906-1921", "64 acres", Taj Mahal marble, a cost figure), this page follows the ledger.
//
// Source keys map to ledger source ids as follows (one key per publication, so a
// book registered under two ledger ids is listed once):
//   vmhHistory H01 | vmhArchitecture S01, VMH-ARCH | vmhGardens S02, VMH-GARD
//   vmhGalleries VMH-GAL | vmhQueensHall VMH-QH | vmhRoyalGallery VMH-RG
//   vmhDurbarHall VMH-DH | vmhPortraitGallery VMH-PG | vmhCalcuttaGallery VMH-CG
//   curzon1925 H02 (S05 is another scan of the same book) | curzonSpeeches H03
//   makranaPapers H04 | ganguly1953 H05, S04, GANGULY1953 | reed1906 H06
//   tour1923 H07 | ronaldshay1922 H09 | wikipedia H12, S08, WIKI-VM
//   wellcome1906 H17 | rol1921 H18 | builder1909 S06 | osm S07 | gacTaj GAC-TAJ
//   moiC37 MOI-C37

const monument = {
  slug: "victoria-memorial",
  name: "Victoria Memorial",
  alternateNames: ["Victoria Memorial Hall"],
  city: "Kolkata",
  region: "West Bengal",
  country: "IN",
  geo: { lat: 22.5448, lng: 88.3426 },
  wikidata: "Q1356352",
  live: true,
  updated: "2026-09-30",
  seo: {
    title: "Victoria Memorial, Kolkata: history and sources",
    description:
      "How the Victoria Memorial in Kolkata was built, 1901 to 1921, from its own records: what is confirmed, what the sources dispute and what no one recorded.",
  },

  // Answers: "What is the history of the Victoria Memorial?"
  answer: [
    {
      text: "The Victoria Memorial Hall in Kolkata was proposed by the Viceroy, Lord Curzon, after Queen Victoria died on 22 January 1901, and he launched the scheme at a public meeting in Calcutta's Town Hall on 6 February 1901. Excavation began on 27 January 1904, George, Prince of Wales, laid the foundation stone on 4 January 1906, and his son Edward, Prince of Wales, opened the Hall on 28 December 1921.",
      cite: ["vmhHistory", "curzonSpeeches", "tour1923"],
      tier: "confirmed",
    },
    {
      text: "The cupolas on its four corner towers were still missing at the opening and were added in the 1930s.",
      cite: ["vmhHistory", "ganguly1953"],
      tier: "confirmed",
    },
  ],

  sections: [
    {
      id: "what-it-was",
      heading: "What it was",
      paragraphs: [
        {
          text: "Curzon's proposal appeared in the Calcutta press on 4 February 1901. He asked for a monumental building that every newcomer to Calcutta would go to see, and an Act of 1903 placed the Hall in the care of a body of Trustees. He wanted the Italian Renaissance style and, on the advice of Lord Esher, chose William Emerson, then President of the Royal Institute of British Architects, as architect.",
          cite: ["curzon1925", "curzonSpeeches"],
          tier: "confirmed",
        },
        {
          text: "Curzon first proposed the north-east corner of the Maidan, near the Ochterlony Monument, and there was an outcry. The Hall went instead to the southern Maidan near the Cathedral, on the ground of the old jail. Because the Maidan's soil would not take foundations much deeper than about four feet, Curzon noted in 1902, the building had to stand on a raised terrace.",
          cite: ["curzon1925"],
          tier: "confirmed",
        },
        {
          text: "In February 1904 the Trustees decided that Indian marble should be used as far as practicable, and on 11 October 1904 the Building Committee agreed to use Makrana marble from Jodhpur in parts of the building.",
          cite: ["makranaPapers"],
          tier: "confirmed",
        },
        {
          text: "George, Prince of Wales, later King George V, laid the foundation stone on 4 January 1906. The journalist Stanley Reed, who was there, describes an afternoon ceremony on the raised foundations. A photograph of the crowd that day is in the Wellcome Collection.",
          cite: ["tour1923", "reed1906", "wellcome1906"],
          tier: "confirmed",
        },
        {
          text: "Then the work slowed. According to the Hall's 1953 guide, little was built for nearly four years after the foundations reached terrace level in September 1905; Martin & Co. of Calcutta signed the contract for the building above ground on 10 March 1910, and the main dome was completed in 1919. Curzon writes that the Hall lost the Government of India's support when the capital moved to Delhi in 1911, and that the war halted the corner cupolas.",
          cite: ["ganguly1953", "curzon1925"],
          tier: "source",
        },
        {
          text: "Edward, Prince of Wales, opened the Hall on 28 December 1921; his father had laid its foundation stone. For the contractors, Sir Rajendra Nath Mookerjee of Martin & Co. handed the Prince a jewelled key to unlock the door. The Trustees said that Vincent Esch had been in charge of carrying out Emerson's design since 1910. Emerson was too ill to attend.",
          cite: ["tour1923"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "what-survives",
      heading: "What survives",
      paragraphs: [
        {
          text: "The Hall's 1953 guide, written by its Secretary and Curator, gives the building's overall size as 338 feet by 228 feet (about 103 by 69 metres), on an open terrace 396 feet by 283 feet. The outline is shaped like a capital H, with curved colonnades at the east and west ends.",
          cite: ["ganguly1953"],
          tier: "confirmed",
        },
        {
          text: "On top of the dome stands a bronze figure of Victory, 16 feet high and about three tons in weight, which turns on its base.",
          cite: ["vmhArchitecture", "ganguly1953"],
          tier: "confirmed",
        },
        {
          text: "Inside, the Queen's Hall lies directly under the main dome. At its centre is Sir Thomas Brock's marble statue of Victoria as she was when she came to the throne in 1837, and under the dome are twelve semicircular canvases by Frank Salisbury of events in her life. The Royal Gallery holds Vasily Vereshchagin's painting of the Prince of Wales at Jaipur in 1876, and a piano made in 1829 for the young Victoria.",
          cite: ["vmhQueensHall", "vmhRoyalGallery", "moiC37"],
          tier: "confirmed",
        },
        {
          text: "Not every room is open. When the Hall's website was checked on 17 September 2026, it marked the Portrait Gallery and the Calcutta Gallery as under major renovation, and the Durbar Hall was showing temporary exhibitions.",
          cite: ["vmhGalleries", "vmhPortraitGallery", "vmhCalcuttaGallery", "vmhDurbarHall"],
          tier: "confirmed",
        },
        {
          text: "Outside, Sir George Frampton's bronze of Queen Victoria, seated on a throne, sits on the marble bridge between the two large ponds on the north side. On the south approach are the King Edward VII Memorial Arch, with Sir Bertram Mackennal's bronze of the King on horseback, and F. W. Pomeroy's marble statue of Lord Curzon.",
          cite: ["vmhGardens", "gacTaj"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "what-is-gone",
      heading: "What is gone",
      paragraphs: [
        {
          text: "The Hall of 1921 had flat-topped corner towers. Its own history says the cupolas were the one part left unfinished, and press photographs taken by Agence Rol at the opening, now held by the Bibliothèque nationale de France, show the towers without them. Curzon, writing in 1925, still called them incomplete.",
          cite: ["vmhHistory", "rol1921", "curzon1925"],
          tier: "confirmed",
        },
        {
          text: "The old jail has gone too. It still stood beside the site at the foundation-stone ceremony in January 1906, and its ground was handed over to the Trustees only in October 1913.",
          cite: ["reed1906", "curzon1925"],
          tier: "confirmed",
        },
        {
          text: "Much of the record of the building work is missing. The Clerk of Works was to send monthly photographs of the work to Emerson; we did not find them in any collection we searched. No source we could reach records how many people built the Hall, or the names of its Indian masons and craftsmen. The Trustees' speech at the opening credits the contractors' firm, its head and a list of European staff, but names none of the masons.",
          cite: ["ganguly1953", "tour1923"],
          tier: "unrecorded",
        },
      ],
    },
    {
      id: "reconstruction",
      heading: "What Epocheye shows, and from what",
      paragraphs: [
        {
          text: "At Victoria Memorial, Epocheye works as a lens on the collection. Point the camera at an object in the galleries, or at the catalogue number on its label, and the app looks for a matching published record; the Hall's catalogue records are published on the Museums of India national portal. When it finds one, it shows short cards, one claim to a card, with the kind of source above each claim and a link to check it at the publisher. When nothing matches, it says that no published record was found, which is a statement about the search, not about the object.",
          cite: ["epocheyeApp", "moiC37"],
          tier: "confirmed",
        },
        {
          text: "The app does not show a 3D reconstruction or a spoken guide at Victoria Memorial. This page draws on Epocheye's evidence file for the Hall, where each statement is tied to a quoted source and graded.",
          cite: ["epocheyeApp", "epocheyeResearch"],
          tier: "confirmed",
        },
      ],
    },
    {
      id: "disputed",
      heading: "Where the sources disagree",
      paragraphs: [
        {
          text: "Height. The Hall's website gives a total height of 200 feet (about 61 metres), and its 1953 guide agrees. Wikipedia gives 184 feet (56 metres), citing a book we have not read. Neither says where the height is measured from or to. The gap equals the 16-foot Victory figure, but no source says that is the reason, so we give both.",
          cite: ["vmhArchitecture", "ganguly1953", "wikipedia"],
          tier: "disputed",
        },
        {
          text: "When building began. Curzon wrote in 1925 that the Hall \"was begun in 1902\". The Hall's website and its 1953 guide date the start of excavation to 27 January 1904. They may describe different stages, but no source says so.",
          cite: ["curzon1925", "vmhHistory", "ganguly1953"],
          tier: "disputed",
        },
        {
          text: "The opening. The official programme, Curzon and the Hall give 28 December 1921; a 1922 review of Bengal's administration under Lord Ronaldshay gives 27 December.",
          cite: ["tour1923", "curzon1925", "vmhHistory", "ronaldshay1922"],
          tier: "disputed",
        },
        {
          text: "The building's size. The Hall's website gives 396 by 283 feet for the building. The 1953 guide gives those figures for the terrace around it, and 338 by 228 feet for the building. The architect's drawing published in The Builder in 1909, measured against its scale bar, fits the guide.",
          cite: ["vmhArchitecture", "ganguly1953", "builder1909"],
          tier: "disputed",
        },
        {
          text: "The gardens. The Hall's website gives 57 acres and Wikipedia gives 64. Our own measurement of the garden's outline on OpenStreetMap comes to about 57 acres.",
          cite: ["vmhGardens", "wikipedia", "osm"],
          tier: "disputed",
        },
      ],
    },
  ],

  unknowns: [
    {
      text: "No source we could reach records how many people built the Hall, the names of its Indian masons and craftsmen, or their wages.",
      cite: ["tour1923", "ganguly1953"],
    },
    {
      text: "The date the Victory figure was raised onto the dome is not recorded in the sources we read.",
      cite: ["curzon1925"],
    },
    {
      text: "The monthly photographs of the work sent to Emerson were not found in any collection we searched.",
      cite: ["ganguly1953"],
    },
    {
      text: "No source we could reach gives the storey heights, the wall thickness or the size of the corner cupolas.",
      cite: ["ganguly1953", "builder1909"],
    },
    {
      text: "None of the sources in our evidence file links the Hall's marble to the Taj Mahal, so that comparison is not repeated here.",
      cite: ["makranaPapers", "curzon1925"],
    },
  ],

  experience: {
    summary:
      "The app identifies objects in the galleries, or reads the catalogue number on a label, and shows sourced cards, one claim each, with a link to check it. If no record is found, it says so. No 3D reconstruction or spoken guide is offered here.",
    cite: [],
  },

  faq: [
    {
      q: "When was the Victoria Memorial built?",
      a: {
        text: "Excavation began on 27 January 1904, the foundation stone was laid on 4 January 1906, and the Hall opened on 28 December 1921. The corner cupolas were added in the 1930s.",
        cite: ["vmhHistory", "ganguly1953", "tour1923"],
        tier: "confirmed",
      },
    },
    {
      q: "Who designed the Victoria Memorial?",
      a: {
        text: "William Emerson, then President of the Royal Institute of British Architects. From 1910 Vincent Esch was in charge of carrying out the design, and Martin & Co. of Calcutta built it.",
        cite: ["curzon1925", "tour1923"],
        tier: "confirmed",
      },
    },
    {
      q: "How tall is the Victoria Memorial?",
      a: {
        text: "The sources disagree. The Hall's website and its 1953 guide give 200 feet (about 61 metres); Wikipedia gives 184 feet (56 metres). Neither says where the height is measured from or to.",
        cite: ["vmhArchitecture", "ganguly1953", "wikipedia"],
        tier: "disputed",
      },
    },
    {
      q: "What marble is the Victoria Memorial built of?",
      a: {
        text: "In October 1904 the Building Committee agreed to use Makrana marble from Jodhpur in parts of the building.",
        cite: ["makranaPapers"],
        tier: "confirmed",
      },
    },
  ],

  sources: {
    vmhHistory: {
      name: "Our History",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/history/",
    },
    vmhArchitecture: {
      name: "Architecture",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/architecture/",
    },
    vmhGardens: {
      name: "Gardens",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/gardens/",
    },
    vmhGalleries: {
      name: "All Galleries",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/galleries/",
    },
    vmhQueensHall: {
      name: "Queen's Hall (Central Hall)",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/queens-hall-gallery-central-hall/",
    },
    vmhRoyalGallery: {
      name: "The Royal Gallery",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/the-royal-gallery/",
    },
    vmhDurbarHall: {
      name: "Durbar Hall",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/durbar-hall-gallery/",
    },
    vmhPortraitGallery: {
      name: "Portrait Gallery",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/potrait-gallery/",
    },
    vmhCalcuttaGallery: {
      name: "The Calcutta Gallery",
      publisher: "Victoria Memorial Hall, Kolkata (official website)",
      url: "https://victoriamemorial-cal.org/the-calcutta-gallery/",
    },
    curzon1925: {
      name: "Marquess Curzon of Kedleston, British Government in India, vol. I (1925), ch. VIII, 'The Victoria Memorial Hall'",
      publisher: "Internet Archive (Digital Library of India scan)",
      url: "https://archive.org/details/in.ernet.dli.2015.211173",
    },
    curzonSpeeches: {
      name: "Lord Curzon in India: a selection from his speeches as Viceroy and Governor-General, 1898-1905 (1906)",
      publisher: "Internet Archive",
      url: "https://archive.org/details/lordcurzoninind00curzgoog",
    },
    makranaPapers: {
      name: "Papers relating to the supply of Makrana marble for the Victoria Memorial Hall, Calcutta (1905)",
      publisher: "Internet Archive (Digital Library of India scan)",
      url: "https://archive.org/details/in.ernet.dli.2015.206498",
    },
    ganguly1953: {
      name: "D. C. Ganguly, Victoria Memorial Hall (1953), the Hall's guide by its Secretary and Curator",
      publisher: "Internet Archive (Digital Library of India scan)",
      url: "https://archive.org/details/dli.scoerat.8404victoriamemorialhall",
    },
    reed1906: {
      name: "Stanley Reed, The Royal Tour in India, 1905-06 (1906)",
      publisher: "Internet Archive",
      url: "https://archive.org/details/india.history.resource.100232",
    },
    tour1923: {
      name: "His Royal Highness the Prince of Wales' Tour in India (1921-1922): programmes, speeches, addresses (1923)",
      publisher: "Internet Archive (Digital Library of India scan)",
      url: "https://archive.org/details/in.ernet.dli.2015.207095",
    },
    ronaldshay1922: {
      name: "The Administration of Bengal under Ronaldshay (1922)",
      publisher: "Internet Archive (Digital Library of India scan)",
      url: "https://archive.org/details/in.ernet.dli.2015.35178",
    },
    wellcome1906: {
      name: "Calcutta: a crowd watches the laying of the foundation stone of the Victoria Memorial Hall, photograph, 1906",
      publisher: "Wellcome Collection (public domain)",
      url: "https://wellcomecollection.org/works/hkaks3vm",
    },
    rol1921: {
      name: "Agence Rol, Victoria Memorial Hall at its inauguration, 28 December 1921 (Rol 71404)",
      publisher: "Bibliothèque nationale de France, Gallica",
      url: "https://gallica.bnf.fr/ark:/12148/btv1b53069650h",
    },
    builder1909: {
      name: "The Builder, vol. 96, 3 April 1909: 'Victoria Memorial Hall, Calcutta'",
      publisher: "Internet Archive",
      url: "https://archive.org/details/sim_building-uk_1909-04-03_96_3452",
    },
    osm: {
      name: "OpenStreetMap, Victoria Memorial building and garden outlines",
      publisher: "OpenStreetMap contributors (ODbL)",
      url: "https://www.openstreetmap.org/way/36165294",
    },
    gacTaj: {
      name: "The Taj of the Raj: The Victoria Memorial Hall and its Gardens",
      publisher: "Victoria Memorial Hall on Google Arts & Culture",
      url: "https://artsandculture.google.com/story/the-taj-of-the-raj-the-victoria-memorial-hall-and-its-gardens-victoria-memorial-hall/4gUhLlkQ3oGsLA",
    },
    moiC37: {
      name: "The Prince of Wales at Jaipur 4th February, 1876 (accession C37)",
      publisher: "Museums of India National Portal, Ministry of Culture",
      url: "https://museumsofindia.gov.in/repository/record/vmh_kol-C37-15406",
    },
    wikipedia: {
      name: "Victoria Memorial, Kolkata (tertiary source)",
      publisher: "Wikipedia",
      url: "https://en.wikipedia.org/wiki/Victoria_Memorial,_Kolkata",
    },
    epocheyeApp: {
      name: "Epocheye app: object recognition and source cards",
      publisher: "Epocheye Private Limited",
      url: null,
      onSite: null,
      internal: true,
    },
    epocheyeResearch: {
      name: "Victoria Memorial Hall evidence file",
      publisher: "Epocheye research",
      url: null,
      onSite: null,
      internal: true,
    },
  },
};

export default monument;
