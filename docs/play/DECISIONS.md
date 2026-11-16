# Epocheye Play: decisions log

Choices made outside the gates, newest last. Each has a date and a reason.

| Date | Decision | Why |
|---|---|---|
| 2026-11-16 | Branch cleanup before Play: merged `claude/hopeful-rubin-ux7guq` and `feat/journeys` (which contains `feat/virtual-summer-palace`) into `main`; archived `claude/color-palettes` as tag `archive/color-palettes`; deleted all six remote branches. | Owner asked for `main` only and answered the three merge questions. The two `claude/*` one-commit branches were already in main. |
| 2026-11-16 | Left out of the journeys merge: `AnnouncementBanner*.jsx` (main removed the banner in #27), the `.pyc`, and `docs/journeys/recording-*.mp4`. | Dead code and build debris. Agreed in the merge question. |
| 2026-11-16 | No Neon migration run for the journeys merge. | `virtual_waitlist` and `journeys_intents` already exist in the production database. |
| 2026-11-16 | Play is built on `feat/play`, the one temporary branch, merged and deleted at GATE 3. | Owner's answer. Keeps production untouched until launch. |
| 2026-11-16 | Linked the repo to the Vercel project `epocheye-website` and pulled env to `.env.local` (gitignored). | Needed to read Neon and, later, to run the Play migration. |
| 2026-11-16 | Palace project folder: `E:\heritage_assets\tipu-summer-palace-bengaluru`, scene `output/blend/TSP_period_world.blend`. | Owner confirmed. |
| 2026-11-16 | Exporter renders the six cube faces directly instead of an equirect that is then cut into faces. | Same pixels, about a quarter less GPU time on the GTX 1650, and no resampling blur. |
| 2026-11-16 | GPU guard: no render while `E:\konark\locks\gpu.lock` exists, or GPU utilisation is above 25 percent, or more than half its memory is held. | The lock is the Konark rule; the other two catch jobs that do not write a lock. |
| 2026-11-16 | Panoramas hide the tiger throne, the inferred furnishings and the inferred people. | Throne and furnishings are on the brief's never-use list; the palace files say the throne never stood here. People are sprites in the pack format, not baked into panoramas. |
| 2026-11-16 | No palace figures in the slice. | Named figures' lines are first-person inventions, which the brief bars. The two role-figure captions with a confirmed source match no fact in section 8. |
| 2026-11-16 | Chapter 1 is evidence only (slot S1 empty). The slice also carries the S2 restoration step as a labelled preview. | Nothing structural is lost, and the brief forbids modelling a loss to fill a slot. GATE 1 still needs a restoration to judge. |
| 2026-11-16 | F09 (Bangalore returned in 1792) cut. | It is on the palace files' do-not-say list, and palace files win, even though Rice 1897 supports it. Flagged in STORY_CHECK.md for the owner. |
| 2026-11-16 | Masks are a strip of six cube faces per restoration per viewpoint, 1024 px a face, greyscale webp. | One request per mask, lines up with the panorama faces with no reprojection. |
| 2026-11-16 | Packs are served from `public/play/packs/<slug>/v<N>/`. | The site has no CDN today; versioned paths make long caching safe. |
| 2026-11-16 | NOW state is derived by the exporter in memory (owner's choice): present-state materials already in the scene, own-photo textures for lawn, hedge and plaster, a Poly Haven brick for the walk. The .blend is never edited. | Owner answered the NOW question. Recipe lives in `tools/play/sites/tipu-summer-palace-bengaluru.json` under `states.now`. |
| 2026-11-16 | Beyond the garden, NOW shows a soft haze shell (radius 62 m), and the credits say the surroundings are not modelled. | Owner's choice. |
| 2026-11-16 | Pack renders switch off the scene's compositor (vignette, glare). | On cube faces a vignette darkens every edge and shows as seams. |
| 2026-11-16 | The slice has three viewpoints: forecourt, ground colonnade, end of the colonnade. The head of the stair is left for Phase 2. | The upper floor renders near black in this scene's late-afternoon light and needs a proper interior lighting pass. The Chapter 1 evidence all fits on the ground floor. |
| 2026-11-16 | Interior viewpoints carry their own exposure (-1.9 against the scene's -3.9) and 256 samples. | A camera would do the same stepping into shade. Set per viewpoint in the site config, in memory. |
| 2026-11-16 | First pack is rendered at 1024 px faces, then again at 2048 px. | The 2048 set is hours of GPU. The 1024 set lets the engine be built and checked against real renders now. |
| 2026-11-16 | Tier mask: everything tagged reconstructed, inferred, unrecorded, described, or confirmed only for 1792 counts as "our reconstruction", and so do the fort, planting and props collections. | The Hunter colours are confirmed for 1792 but he drew a different front, so their placement on this front is ours (fact M2). |
| 2026-11-16 | Lenses in the slice: Traveller and Child have their own wording; Builder and Scribe share the Traveller wording. Builder has one side note in Chapter 1; Scribe and Traveller have none. | The brief says the lens changes wording level and adds a side note only where the palace files have one. The inscription is not in the palace files, so it cannot be a Scribe note yet. |
| 2026-11-16 | Wrong picks in the Chapter 1 choice got one explanation line each (A and B), which section 8 does not script. | Brief 1.1 requires a wrong pick to explain why the evidence rules it out. Both lines cite verified facts (F04, F05, F24). Listed for approval at GATE 1. |
| 2026-11-16 | Line p-02 ("Most visitors photograph the front...") ships in the preview as a marked placeholder. | It is the owner's own observation and only the owner can confirm it. `validate-story.mjs --ship` fails while it is a placeholder. |
