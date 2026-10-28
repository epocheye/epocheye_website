// Heritage sites visitors can pre-order on /preorder. None of these is in the
// Epocheye app yet: the pre-order count decides which gets built first.
// Keep this list free of the four live monuments (lib/monuments/live.js).
// Client-safe: the leaderboard and the API both read it.
export const PREORDER_SITES = [
	{ slug: "hampi", name: "Hampi", place: "Karnataka" },
	{ slug: "konark-sun-temple", name: "Konark Sun Temple", place: "Odisha" },
	{ slug: "taj-mahal", name: "Taj Mahal", place: "Agra" },
	{ slug: "qutub-minar", name: "Qutub Minar", place: "Delhi" },
	{ slug: "red-fort", name: "Red Fort", place: "Delhi" },
	{ slug: "golconda-fort", name: "Golconda Fort", place: "Hyderabad" },
	{ slug: "kailasa-ellora", name: "Kailasa Temple, Ellora", place: "Maharashtra" },
	{ slug: "ajanta-caves", name: "Ajanta Caves", place: "Maharashtra" },
	{ slug: "fatehpur-sikri", name: "Fatehpur Sikri", place: "Uttar Pradesh" },
	{ slug: "mysore-palace", name: "Mysore Palace", place: "Mysuru" },
	{ slug: "shore-temple", name: "Shore Temple", place: "Mamallapuram" },
	{ slug: "nalanda", name: "Nalanda Mahavihara", place: "Bihar" },
];

// A site not on the list; the visitor types its name.
export const OTHER_SITE = "other";

export const SITE_BY_SLUG = new Map(PREORDER_SITES.map((s) => [s.slug, s]));
