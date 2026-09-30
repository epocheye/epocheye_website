// Registry of monument pages. Each file follows docs/seo/monument-content-spec.md and is
// checked by scripts/check-monument-claims.mjs. Only monuments listed as live in
// docs/canonical_public_claims.md belong here.
import tipuSummerPalace from "./tipu-summer-palace-bengaluru";
import bangaloreFort from "./bangalore-fort";
import victoriaMemorial from "./victoria-memorial";
import indianMuseum from "./indian-museum";

export const MONUMENTS = [tipuSummerPalace, bangaloreFort, victoriaMemorial, indianMuseum];

export function getMonument(slug) {
	return MONUMENTS.find((m) => m.slug === slug) ?? null;
}

// Numbers each source in first-cited order so the page can show [1], [2]… inline and a
// matching list at the foot. Works for monuments and WHAT'S GONE episodes.
export function orderedSources(m) {
	const order = [];
	const visit = (cite = []) => {
		for (const id of cite) if (!order.includes(id)) order.push(id);
	};
	m.answer.forEach((p) => visit(p.cite));
	m.sections.forEach((s) => s.paragraphs.forEach((p) => visit(p.cite)));
	m.unknowns?.forEach((u) => visit(u.cite));
	visit(m.experience?.cite);
	m.faq?.forEach((f) => visit(f.a.cite));
	return order.map((id, i) => ({ id, n: i + 1, ...m.sources[id] }));
}
