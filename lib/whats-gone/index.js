// WHAT'S GONE: one companion page per weekly episode. One monument, one thing that no
// longer exists, the reconstruction, the honest gap. The shape and rules are the same as
// the monument pages (docs/seo/monument-content-spec.md, docs/seo/whats-gone-template.md),
// and scripts/check-monument-claims.mjs checks every episode.
//
// Episode shape:
// {
//   slug: "tipu-summer-palace-the-lost-colour",
//   episode: 1,
//   monument: "tipu-summer-palace-bengaluru",   // must be a slug in lib/monuments
//   title: "The lost colour of Tipu Sultan's Summer Palace",
//   published: "2026-10-06",
//   updated: "2026-10-06",
//   seo: { title, description },
//   answer: [paragraph],                         // 2–3 sentences: what is gone
//   sections: [                                  // these four ids, in this order
//     { id: "the-monument", heading: "The monument", paragraphs: [...] },
//     { id: "what-is-gone", heading: "The thing that is gone", paragraphs: [...] },
//     { id: "reconstruction", heading: "The reconstruction", paragraphs: [...] },
//     { id: "the-gap", heading: "The honest gap", paragraphs: [...] },
//   ],
//   sources: { id: { name, publisher, url | onSite | internal } },
// }

export const EPISODE_SECTION_IDS = ["the-monument", "what-is-gone", "reconstruction", "the-gap"];

export const EPISODES = [];

export function getEpisode(slug) {
	return EPISODES.find((e) => e.slug === slug) ?? null;
}
