// Display names for Play. Players never type a name: every name is one adjective and one noun
// from the two lists below, words from buildings and heritage. No people's names, nothing that
// can be read as a slur or a joke at anyone. 32 x 24 = 768 names.
// Pure and the same on server and client.

export const ADJECTIVES = [
	"Amber", "Arched", "Bright", "Carved", "Cedar", "Coral", "Domed", "Dusky",
	"Fluted", "Gilded", "Golden", "Granite", "Hidden", "Ivory", "Jade", "Lofty",
	"Marble", "Misty", "Mossy", "Painted", "Quiet", "Russet", "Sandstone", "Shaded",
	"Silver", "Stately", "Sunlit", "Teak", "Tiled", "Vaulted", "Weathered", "Woven",
];

export const NOUNS = [
	"Arch", "Balcony", "Bastion", "Beam", "Bracket", "Capital", "Colonnade", "Column",
	"Corbel", "Cornice", "Courtyard", "Cupola", "Doorway", "Fountain", "Gallery", "Gateway",
	"Keystone", "Lantern", "Lintel", "Niche", "Pavilion", "Pillar", "Rampart", "Terrace",
];

export const NAME_COUNT = ADJECTIVES.length * NOUNS.length;

// FNV-1a, 32 bit. Stable across platforms and versions.
function hash(text) {
	let h = 2166136261;
	const s = String(text);
	for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
}

export function nameAt(index) {
	const i = ((Math.trunc(index) % NAME_COUNT) + NAME_COUNT) % NAME_COUNT;
	return `${ADJECTIVES[Math.floor(i / NOUNS.length)]} ${NOUNS[i % NOUNS.length]}`;
}

// The same seed (an anonymous player id) always gives the same name.
export function nameFor(seed) {
	return nameAt(hash(seed));
}

export function isListedName(name) {
	if (typeof name !== "string") return false;
	const [a, n, ...rest] = name.split(" ");
	return rest.length === 0 && ADJECTIVES.includes(a) && NOUNS.includes(n);
}
