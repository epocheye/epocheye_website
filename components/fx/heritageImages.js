// Curated, content-verified heritage photography.
// Remote shots are Unsplash (allowlisted in next.config.mjs) and were visually
// confirmed to match their label; the rest are the repo's local heritage webp.
const U = (id, w = 1600) =>
	`https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const IMG = {
	taj: U("1564507592333-c60657eea523"), // Taj Mahal, India
	colosseum: U("1552832230-c0197dd311b5"), // Colosseum, Italy
	greatWall: U("1508804185872-d7badad00f7d"), // Great Wall, China
	machu: U("1587595431973-160d0d94add1"), // Machu Picchu, Peru
	pyramids: U("1503177119275-0aa32b3a9368"), // Pyramids of Giza, Egypt
	boudhanath: U("1605640840605-14ac1855827b"), // Boudhanath Stupa, Nepal
};
