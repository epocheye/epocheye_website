# Play audit: Tipu Sultan's Summer Palace

Date: 2026-11-16. Everything here was read-only: Blender ran in the background (`blender -b`), nothing was saved, the open Blender window and its connector were not used, `pr_kit` was not touched. Test images are in `tools/play/out/audit/` (not committed).

## Verdict: NEEDS WORK

The THEN state is ready. Three things are not:

1. **There is no NOW state.** This is the blocker, and it is more than a day of work. Details in section 3.
2. **Interiors are not lit for stills.** They render near black at the scene exposure. Fixable per viewpoint in the exporter (section 2).
3. **Three places the script stands in are not in the model**: the north front, the west front, and an open court with fountains (section 5).

## 1. Where the project is

- Folder: `E:\heritage_assets\tipu-summer-palace-bengaluru` (owner confirmed).
- Scene: `output/blend/TSP_period_world.blend`, 320 MB, 7,068 objects, 119 materials, 151 images. Cycles, AgX, exposure -3.9, 96 samples, sky `PR_Sky`. Period moment per `TSP_period_assumptions.md`: 1 March 1791, 17:10.
- Linked libraries, both present: `bangalore-fort/output/blend/fort_INTACT_1791.blend`, `palace_materials.blend`.
- Three images resolve to a wrong path (`Ground_earth_1k*.jpg`). They exist in `bangalore-fort/output/`. The exporter remaps them in memory.
- Other blends (`palace_COURT_1791`, `palace_SIEGE_1791`, `film/TSP_film*`, `phone_review_*`) are older or derived. Not used.

## 2. Does it render photoreal in Cycles today

Yes for exteriors, not yet for interiors.

| Test | Result |
|---|---|
| `TSP_Cam_S1_arrival`, 960x540, 96 samples, GPU (OptiX) | 25 s. Clean. Looks like our existing renders. `test_S1_arrival.png` |
| Forecourt panorama (P0), 2048x1024, 96 samples | 39 s. Clean. `probe_P0_then.png` |
| Hall interior panorama, 2048x1024, 96 samples, scene exposure | 75 s. Almost black. `probe_equirect_look_2048.png` |
| Same, exposure raised 3.4 stops | Readable but dark and blotchy from the denoiser. `probe_equirect_look_ev0.png` |
| Ground colonnade (P2), exposure -2.2, 128 samples | Usable floor and pillars, dark ceiling. `probe_P2_then.png` |

Why: the sun is low in the WSW and the open front faces ESE, so the interior only gets sky light. The film stills (`output/film/stills2/`) solved this shot by shot with their own exposure. The exporter does the same: exposure and sample count are set per viewpoint in `tools/play/sites/<slug>.json`, in memory.

**Blender 5.2 to 5.3.** The file was saved in 5.2.45 and this machine runs 5.3.0. It loads, links and renders with no errors. OptiX works on the GTX 1650. The only message is a deprecation warning for `Material.use_nodes` in my own script. I did not find anything that behaves differently, but I have not compared a 5.3 frame pixel for pixel against a 5.2 frame of the same camera.

**Render time on this machine (GTX 1650, 4 GB).** Scaled from the probes: about 15 minutes per exterior viewpoint and 1 to 2 hours per interior viewpoint, for both states at 2048 px cube faces. A full level of about 12 viewpoints is roughly 9 to 17 GPU hours. The slice (4 viewpoints) is 3 to 6 hours. `export_pack.py <slug> estimate` prints the real figure before any render and refuses to run while `E:\konark\locks\gpu.lock` exists or the GPU is busy.

## 3. THEN and NOW

**THEN: present.** `TSP_Palace_rebuilt` (1,298 objects) with the Hunter 1792 exterior scheme, madder interior walls on the upper floor, the painted ceiling, gilt arch heads, the packed-earth court, the fort around it.

**NOW: missing.** The build has two states, `COURT_1791` and `SIEGE_1791`. Nothing renders the building as it is today.

What exists towards a NOW:
- `TSP_OFF_present_state`: today's garden only (lawn, hedges, brick walk, beds), 20 objects, flat materials.
- Present-state materials already inside the THEN model: `PILLAR_SHAFT_TIMBER__CONFIRMED`, `CEILING_TIMBER__CONFIRMED`, `WALL_INT_OCHRE__PRESENT-STATE`, `WALL_INT_DADO__PRESENT-STATE`, `FLOOR_TERRACOTTA__PRESENT-STATE`.
- A present-state painted-wall texture from our own photo (`output/tex/own_wall_floral.jpg`), kept out of THEN on purpose.
- 48 own photographs of the building today (unencumbered), not shot from the viewpoints.

I tested a NOW derived in memory by swapping the reconstructed materials for the present-state ones and showing the garden (`probe_P0_now.png`). It is not good enough to ship: the garden is flat CG, and beyond it there is nothing, because today's surroundings (the city, the temple next door, the road) are not modelled and must not be invented. It would be a fake NOW.

**What an honest NOW would take** (my estimate: two to three days, so I am stopping to ask before doing it, as the brief requires):
1. A present-state material set built from our own photos: polished dark timber, today's plaster, the sooted surviving paint where it survives, gilding where it survives today. About a day, with a check against the photos for each surface.
2. Today's garden with real materials (grass, hedge, brick), from photos 01 and 02. Half a day.
3. A rule for what lies beyond the compound. Options: fade to haze and say so, or keep NOW viewpoints inside and under the colonnade only. Owner's call.
4. Per-viewpoint exposure for interiors. Needed anyway.

The alternative is real 360 photos shot on site, but the design needs NOW and THEN from the same camera so the masks line up, so photos cannot replace a rendered NOW. They would be the reference to match it against.

## 4. Lost elements, with evidence

From `research/palace-measurements.md`, `palace-dimensions.json`, `TSP_period_assumptions.md` and the build scripts.

| Element | Evidence | Tier in the files | In the model | Slot |
|---|---|---|---|---|
| Exterior colour scheme | Hunter watercolour, Feb 1792 (Yale B1974.12.1168) | Confirmed for 1792 | Yes (`*_EXT_HUNTER1792*`) | S2 |
| Interior wall painting | Own photo 41; Mike Prince photo; Buchanan | Idiom confirmed, composition unrecorded | Yes, upper floor (`WALL_INT_MADDER__DECORATION-RECONSTRUCTED`) | S3 or S5 |
| Painted ceiling | Own photo 37 | Pattern confirmed, extent inferred | Yes (`CEILING_PAINTED__PATTERN-CONFIRMED`) | S5 |
| Gilding on the arch heads | Own photos 12, 21; Buchanan "false gilding" | Confirmed | Yes (`ARCH_CUSPED_GILT__CONFIRMED`) | S3 |
| Court ground: packed earth, no lawn | Hunter 1792 | Confirmed for 1792 | Yes; today's garden in `TSP_OFF_present_state` | S2 or S3 |
| Octagonal tree platform | Hunter 1792 | Form confirmed, position inferred | Yes | S2 |
| Fort around the palace | Mackenzie survey, March 1791 | Plan confirmed, heights inferred | Yes (`TSP_R3_fort_mackenzie_1791`) | Chapter 2 context |
| Fountains | Buchanan | No dimensions | **No** | Evidence only |
| Side wings, gate passage, entrance square | Hunter; Buchanan | Outside the model | **No** | Evidence only |
| Stair, galleries, two-storey hall | Standing fabric | Confirmed | Yes, but not lost | **S1 has no lost element** |

**Empty panels.** The model does both A and B of the Chapter 5 choice: it repeats the one recorded pattern across the upper floor and labels the extent as inferred, and it leaves the ground floor ceiling plain timber and the ground floor walls in their present state. It never invents a pattern.

**Must be hidden for Play:** the tiger throne (`TSP_Throne_rebuilt`, `Throne__COURT_1791`; the files say it never stood here) and the inferred furnishings (`Furnish_*`). Both are on the brief's never-use list. The inferred people collections are also hidden in panoramas.

## 5. Viewpoints

Twelve authored viewpoints in `output/palace_viewpoints.json` (P0 to P10, P0b), eye height 1.6 m. The exporter can place a panorama at any point, so the list below is what already exists.

| Script place | Existing viewpoint |
|---|---|
| Forecourt | P0, P0b |
| Ground colonnade | P1, P2 |
| The stair | P4 (top only) |
| Upper hall | P5 |
| The ceiling | P6 (same point as P5, looking up) |
| Balcony | P7, P8 (never shipped: nothing to look out at) |
| Ground floor rooms | P3 (a sealed room, no doorway modelled), P10 |
| North front, west front | **None.** The model's fronts are ESE and WNW. Hunter drew a front and wings this model does not cover |
| Open court looking up, with fountains | **None.** Not modelled |

So Chapter 2 cannot stand at "the north and west fronts" and Chapter 3 cannot start in "the open court with fountains". Both become evidence shown on a card at a viewpoint that does exist. See STORY_CHECK.md.

## 6. Figures and voice lines

In the app (`E:\epocheye\src\features\magicwindow\people.ts`): Purnaiah, Tipu Sultan and Hyder Ali as named figures with first-person lines, and three role figures (a court attendant, a rocket-man, a Mysore trooper). The files' own rule for these lines is "the manner is invented, the matter is not".

For Play, the brief allows no invented dialogue for a real person, so **none of the named figures' lines can be reused**. Role figures may appear as unnamed sprites with a sourced caption. Two captions have a confirmed source:
- Court attendant's dress (purple coat, white spots, red sash): Robert Home, National Army Museum 1976-11-86.
- "Spots, not stripes" on the soldiers' dress: Gold 1806 and Home.

Neither belongs to a fact in section 8, so the slice ships no figures. Logged in DECISIONS.md.

## 7. Licences

| Asset | Status | Usable on a public commercial site |
|---|---|---|
| Hunter watercolour of the palace, Feb 1792, Yale B1974.12.1168 | CC0 | Yes |
| Hunter 1804 aquatints of the palace (north, west, square) | **Not on disk.** No scan, holder or licence recorded | **No, not cleared.** Chapter 2 needs these or must use the one watercolour |
| Hunter 1804 gate aquatints, British Library | Public domain on Commons; the two fort notes disagree on whether a per-file check is done | Check each file before use |
| Robert Home 1794, "Inside View of the Palace at Bangalore" | Public domain by age | Yes |
| Mackenzie plan, RCIN 735001 | Royal Collection scan is measurement only. Commons copy is PD-old | Commons copy only |
| Poly Haven textures and sky | CC0 | Yes |
| Own photographs (48) | Own work | Yes, except the nine photos of ASI display boards |
| Mike Prince photographs (8) | CC BY 2.0 | Yes **with attribution**. One is inside the shipped texture `interior_madder_photo.jpg`, so every pack must credit him. `docs/virtual/TEXTURES.md` wrongly calls that texture our own |
| 68 CC BY-SA Commons photos | Share-alike | No |
| `the_lost_colour.jpg` | AI-generated, on the do-not-use list | No |
| Project-made tiles (exterior diaper, painted ceiling, gilding) | Authored by the project | Owner to confirm provenance |
| Meshy-generated figure models | No licence statement in the files | **Unclear.** Not used in the slice |
| V&A Home rocket-man watercolours | PD on Commons, V&A's own files are non-commercial | Needs a human sign-off |

## 8. What I need from you

1. A decision on the NOW state (section 3).
2. Scans of Hunter's 1804 palace plates with a clear licence, or agreement that Chapter 2 uses the one Yale watercolour.
3. Confirmation that the project-made tiles are your own work.
