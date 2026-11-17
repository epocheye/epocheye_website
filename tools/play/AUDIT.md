# Play audit: Tipu Sultan's Summer Palace

Date: 2026-11-16. Everything here was read-only: Blender ran in the background (`blender -b`), nothing was saved, the open Blender window and its connector were not used, `pr_kit` was not touched. Test images are in `tools/play/out/audit/` (not committed).

## Verdict: NEEDS WORK

**Update, Phase 2 (2026-11-16).** This verdict is the Phase 0 one. Since then a NOW state is derived by the exporter (owner's choice at the audit) and the interiors render with their own exposure. Sections 2, 3 and 5 below describe the scene as it stands now. Item 3 has not changed.

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

**THEN: present, rendered as saved.** `TSP_Palace_rebuilt` (1,298 objects) with the Hunter 1792 exterior scheme, madder interior walls on the upper floor, the painted ceiling, gilt arch heads, the packed-earth court, the fort around it. The exporter hides the tiger throne, the inferred furnishings and the inferred people, and changes nothing else.

**NOW: derived by the exporter, in memory.** The .blend still has no present-day state of its own (its two states are `COURT_1791` and `SIEGE_1791`). The owner chose a derived NOW at the audit. The recipe is `states.now` in `tools/play/sites/tipu-summer-palace-bengaluru.json`, and the .blend is never edited or saved:

| What | THEN | NOW |
|---|---|---|
| Exterior walls, arches, shafts, bases, caps, eave fringe | Hunter 1792 colours | Plaster from our own photo; dark timber; carved stone |
| Upper-floor walls (`WALL_INT_MADDER`) | Madder ground with floral painting | Plain plaster from our own photo (`own_plaster_clean.jpg`) |
| Upper-floor ceiling (`CEILING_PAINTED`) | Painted, maroon with rosettes | Plain timber (`CEILING_TIMBER__CONFIRMED`) |
| Court | Packed earth, tree platform, planting, props | Today's garden (`TSP_OFF_present_state`) with own-photo lawn and hedge, Poly Haven brick |
| Fort | Mackenzie 1791 | Hidden |
| Beyond the garden | The fort | A haze shell, radius 62 m. Today's surroundings are not modelled |

Unchanged between the two states: the timber pillars and entablature, the gilt arch heads (gilding survives today: it shows in own photos 19, 30 and 36), the terracotta upper floor, the stone flags, the ground-floor ochre walls and dado, which are already present-state materials.

**What NOW gets right and where it stops.**
- Checked against own photos 19, 30 and 36: today's upper floor is dark timber overhead, plaster on the walls, terracotta underfoot. The derived NOW shows that.
- **Where paint survives today is not mapped, so NOW shows plain surfaces.** Own photographs 37 (a painted ceiling) and 41 (a painted wall panel with its niche) prove paint survives in at least one room. No file says which room or which panels, and photo 40 only shows a small room with a terracotta floor and a door. Placing the surviving paint on a chosen wall would be a guess, so NOW carries plain plaster and plain timber everywhere and the pack credits say so. The present-state texture `output/tex/own_wall_floral.jpg` stays unused for the same reason. The two photographs ship as evidence images instead.
- The NOW plaster is one pale tile. The photographs show weathered, pinkish and grey plaster. It is honest as "plaster where the paint is lost", not a match for each wall.
- The NOW ceiling and the long upper walls are single very large objects whose textures the scene maps once across the whole object, so they read as smooth and slightly smeared rather than as boards. See section 2.
- The garden is still flat: lawn, hedge blocks and brick walk with photo textures and no planting.

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

Twelve authored viewpoints in `output/palace_viewpoints.json` (P0 to P10, P0b), eye height 1.6 m. The pack has eight. Positions are in the building frame: X along the front, Y into the building, Z up; the plinth floor is z 0, the upper floor z 2.6, the forecourt ground z -0.7.

| Pack viewpoint | From | Position | Links | Notes |
|---|---|---|---|---|
| `forecourt` | P0 | 0, -14, 0.9 | forecourt-corner, colonnade | |
| `forecourt-corner` | P0b | -8, -14, 0.9 | forecourt | Beside the tree platform |
| `colonnade` | P1 | 0, 1.9, 1.6 | forecourt, colonnade-end, hall-floor | |
| `colonnade-end` | P2 | 7.5, 1.9, 1.6 | colonnade, upper-hall | The link to the upper hall is the stair |
| `hall-floor` | new | 0, 11, 1.6 | colonnade | Middle of the two-storey hall, galleries on all four sides, ceiling 3.4 m above the eye |
| `upper-hall` | P5 | 0.94, 2.9, 4.2 | colonnade-end, balcony, corner-room | On the front gallery, looking into the hall |
| `balcony` | P7, moved | 0, 1.5, 4.2 | upper-hall | See below |
| `corner-room` | P9, moved | 7.5, 20.6, 4.2 | upper-hall | Centre of the far corner room. P9 itself is 0.5 m from the outer wall |

**The balcony viewpoint is not on a balcony.** P7 is authored 0.8 m outside the front, on a projecting balcony. In `TSP_period_world.blend` the balcony objects (`Balcony_ESE_floor`, brackets, rail, arch) are switched off for render, and the palace files tier the projection as unrecorded. A test frame at P7 hangs in the air beside a pillar head with the ground 4.9 m below. The exporter does not switch hidden geometry on, so the viewpoint was moved 2.3 m back to the front arcade of the upper floor, on the building's centre line, looking out over the forecourt through the middle arch. The floor there ends 0.5 m in front of the eye with no rail. The pack credits say the projecting balcony is not shown.

**Each position was checked** with 26 rays (`tools/play/blender/probe_points.py`, results in `tools/play/out/audit/probe_points.json`) and a test frame. All eight stand in free air.

| Script place | State |
|---|---|
| Forecourt, ground colonnade, upper hall, the ceiling, a small private room | In the pack |
| The stair | No viewpoint on it. `colonnade-end` to `upper-hall` is the walk up it |
| Ground floor rooms | `hall-floor` is the hall. P3 is a sealed room with no doorway modelled; P10 faces the hidden throne. Neither is used |
| North front, west front | **None.** The model's fronts are ESE and WNW. Hunter drew a front and wings this model does not cover |
| Open court looking up, with fountains | **None.** Not modelled |

So Chapter 2 cannot stand at "the north and west fronts" and Chapter 3 cannot start in "the open court with fountains". Both are evidence shown on a card at a viewpoint that does exist. See STORY_CHECK.md.

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
