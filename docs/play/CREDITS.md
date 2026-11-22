# Credits: Epocheye Play, open world

Every model, animation, sound, font, texture and package added for the open world, with its licence. The brief's rule is that nothing with an unclear licence ships. **Two items below are still open (2 and 3). Item 1, which blocked a public launch, was closed on 2026-11-22.** See "What the owner must confirm". The root `CREDITS.md` covers `/journeys` only.

"Read" in the last column means the licence text itself was opened on that date, at the place named. This is a record of what the sources say. It is not legal advice.

## In the current build

| Asset | Used for | Author or source | Licence | Read |
|---|---|---|---|---|
| Universal Animation Library (Standard) | Player body and moves. Weapon, combat and death clips are not exported | Quaternius, via [OpenGameArt](https://opengameart.org/content/universal-animation-library). Source and licence file kept in `tools/play/assets/cc0/universal-animation-library/` | CC0 1.0 | 2026-11-22, `License.txt` in the pack |
| MakeHuman and MPFB assets | Townspeople's bodies, skin (`young_african_male`, `middleage_african_male`, `young_african_female`), eyes (`high-poly`) and hair (`braid01`). Brows, lashes, teeth and tongue are in the source figures but dropped by `pack_actors.mjs` | MakeHuman system assets, through MPFB 2.0.18 | CC0 | 2026-11-22: the CC0 header in each asset file and `license: CC0` in `packs/makehuman_system_assets.json` (local MPFB, Blender 5.2 and 5.3); [licence page](https://static.makehumancommunity.org/about/license.html); [2020 change](https://static.makehumancommunity.org/oldsite/faq/what_changed_regarding_the_license_in_2020.html), which covers the base mesh, targets and proxies. MPFB's code is GPL-3.0-or-later and is not shipped |
| Townspeople's clothes | Dhoti, shawl, sari, jacket, turban | Modelled for Epocheye. Colours are procedural (`costume_lib.py`), and `costume.py` loads no image | Own work | 2026-11-22, build scripts |
| Townspeople's walk, idle and talk | Every person in the world | `Walk_Loop`, `Idle_Loop` and `Idle_Talking_Loop` from the Universal Animation Library by Quaternius, retargeted onto each MPFB rig by `tools/play/blender/retarget_cc0.py`. The derived clip data is in `tools/play/assets/cc0/people/` | CC0 1.0 | 2026-11-22, `License.txt` in the pack |
| Bullock cart | Ride | Text-to-3D with Meshy, 2026-09-09, simplified for the web | Owned by the customer on a paid plan. CC BY 4.0 with credit to Meshy on a free plan. The in-game credit meets both. **Plan to confirm, see item 2** | 2026-11-22, Meshy Terms of Use section 3.2 |
| Tamarind tree card | Trees | [Tree Small 02](https://polyhaven.com/a/tree_small_02) by Rico Cilliers, Poly Haven | CC0 | 2026-11-22, asset page and [licence page](https://polyhaven.com/license) |
| Palm tree cards | Trees | Geometry built for Epocheye by `_palm()` in `tools/palace_trees.py`. That script gives it the flat colour materials `SITE_BARK` and `SITE_LEAF_*`, and the scene audit lists no image on `SITE_BARK` | Own work | 2026-11-22, build script and audit. The scene itself was not opened |
| Poly Haven surface textures | World surfaces. The whole-fort cells bake `rough_block_wall` (stone), `red_laterite_soil_stones` (earth), `clay_plaster` (plaster) and `brown_mud_dry` (court earth) into their atlases | Poly Haven authors, logged per file in `output/tex/cc0/cc0_textures.json` and `research/material-sources.md` in the palace assets | CC0 | 2026-11-22, [licence page](https://polyhaven.com/license) and the logs. Each file's page was not opened |
| Fort, gate, outwork, ditch and pettah geometry | The whole-fort map | Epocheye's own reconstruction in `TSP_period_world.blend` and `fort_INTACT_1791.blend`. Roofs, mud walls and timber in the pettah use flat colour materials with no image | Own work | 2026-11-22, the scene's material list. The earth material `EARTH__DIM-CONFIRMED` carries `Ground_earth_1k` but is only on the pettah roads, which are not exported |
| Own photographs | Present-day surfaces | Epocheye, September 2026 | Own work | Per the site config |
| Project-made gilding tile (`gilding_512.jpg`) | Cusped arches. No swap replaces this material in the NOW state, so it is expected in `palace_now` | Recorded as made by the project | **Provenance unconfirmed, see item 3** | 2026-11-22, site config and `tools/play/AUDIT.md` |
| Kokoro-82M, voices `af_heart`, `hm_omega`, `hm_psi` | Narration, carpenter, mason | hexgrad, see `tools/play/voice/LICENSES.md` | Apache-2.0 | 2026-11-22 for the two role voices |
| Anton | Display font for titles and splashes | The Anton Project Authors, [Google Fonts](https://github.com/googlefonts/AntonFont) | SIL OFL 1.1 | 2026-11-22 |
| @react-three/rapier 2.2.0 | Physics bindings | Poimandres, [repo](https://github.com/pmndrs/react-three-rapier) | MIT (repo licence; the npm package has no licence field) | 2026-11-22 |
| @dimforge/rapier3d-compat | Physics engine | Dimforge, [repo](https://github.com/dimforge/rapier.js) | Apache-2.0 | 2026-11-22 |

## Not in the current build

| Asset | Why it is listed | Status |
|---|---|---|
| Horse and elephant (`hampi/assets/generated/meshy`) | Planned rides for Phase 2 | Generated with Meshy. Same plan question as the cart |
| `palace_then` atlas | Contains the interior wall texture derived from a [photograph by Mike Prince](https://commons.wikimedia.org/wiki/File:Tipu_Sultan%27s_Summer_Palace_(16414465309).jpg), CC BY 2.0 | No longer published, because the world does not use it. If a later phase uses it, the credit to Mike Prince must be added first. In the NOW state that material is swapped for plain plaster |
| Poly Haven [Palm Tree Bark](https://polyhaven.com/a/palm_tree_bark) (Dimitrios Savva, Rico Cilliers, CC0) | Used by the `TSP_MAT_palm_bark` material in the mobile tree build | Not credited as part of the palm cards, because the build script for those palms does not use it |

## What the owner must confirm

1. **The people's animation. Closed 2026-11-22.** The old clips appeared to be Meshy "Service Assets" (Meshy Terms of Use, last updated 2026-09-19, sections 2.3 and 3.1), which may not be licensed for use on MakeHuman bodies. They were replaced with the CC0 Quaternius clips rather than argued over. `pack_actors.mjs` now deletes every clip a source figure carries, builds `walk`, `idle` and `talk` only from the CC0 data, stops if that data is missing, and reads the written file back. All four published figures were read back on 2026-11-22: three clips each, all marked CC0. The source figure GLBs in the palace assets still contain the Meshy clips, so they must only reach the game through this packer.
2. **The Meshy plan on 2026-09-09, for the cart.** The in-game credit is correct on either plan, but the licence that applies depends on it. The cart and the figures that carried the clips sit under two different Meshy account ids in their download URLs, so check both accounts. The Meshy terms read for this file are dated 2026-09-19, ten days after the cart was made on 2026-09-09. The version in force on the day the cart was made has not been read, so section 3.2 above may not be the wording that applies to it.
3. **Where the gilding tile came from.** Open since the audit. If it was made from a third party's image, that image's licence applies.

## Credit lines shown in the game

The game's Credits view shows the `credits` list in `content/play/<slug>/missions.json`. Change them there, and keep them matching this file.
