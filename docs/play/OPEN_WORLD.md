# Epocheye Play, open world: how it works

Draft during Phase 2. The commands below are the ones in use; sections on later features are added as they land.

**State of the map (2026-11-23, world v3).** Eight streamed cells cover the whole fort, from outside the Delhi Gate, round the outwork, over the causeway, through the gate, along to the palace court and up the ramp to the rampart walk. Three tanks hold still water in 1791. The horse rides outside the walls and the elephant outside the palace court and on the avenue; their models load on demand. Whole world 12.66 MB plus the voice clips for Missions 2 to 5. The full-screen map is not built yet.

A world is two things: **exported assets** in `public/play/worlds/<slug>/v<N>/`, and **one hand-written file**, `content/play/<slug>/missions.json`. The engine (`lib/play/world/`, `components/play/world/`) has no site-specific code.

## Add a world

1. Write `tools/play/worlds/<slug>.json`: the Blender site config, the moment (sun), cells with their groups, what is never exported, where rides may not go, people's routes.
2. Estimate, then bake. The exporter checks `nvidia-smi` and takes `E:\konark\locks\gpu.lock`. If the lock exists it stops at once and never removes it, even if it looks stale: whoever owns a dead job clears it by hand. On any error it stops Blender first and releases the lock after.

```powershell
python tools/play/export_world.py <slug> estimate
```

```powershell
python tools/play/export_world.py <slug> bake --samples 128
```

3. Turn the bakes into atlases, render the tree cards, retarget the people's motion, pack the actors and publish.

```powershell
python tools/play/compose_world.py tools/play/out/world/court
```

```powershell
python tools/play/export_world.py <slug> cards
```

The people's clips are CC0 motion from the Quaternius library, retargeted per figure into `tools/play/assets/cc0/people/<figure>.json`. Run this when a figure is added or its rig changes. It uses the CPU only.

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --factory-startup --python tools/play/blender/retarget_cc0.py -- --world tools/play/worlds/<slug>.json
```

`pack_actors.mjs` deletes every clip in a source figure and uses only that data. A figure without it stops the pack. The pack writes straight to the live `actors` folder, and publish carries those files over. Add `--out <folder>` to check a pack somewhere else first.

A figure is simplified part by part, to budgets at the top of the geometry section in `pack_actors.mjs`, so `tris` and `error` in the world config apply only to the player and to props. Set `atlas` per figure (1024 for people). The pack measures how fast the planted foot moves in the walk clip and stores it in the GLB as scene extras, `walk_speed`. The engine uses it to match the walk to ground speed, so a new figure needs no engine change.

```powershell
node tools/play/pack_actors.mjs <slug>
```

```powershell
python tools/play/export_world.py <slug> publish
```

Publish needs no GPU. It builds the whole version in `tools/play/out/world/_publish/`, packs only the groups and textures `world.json` names, carries over the actors and audio it references, and fails without touching the live folder if any file is missing. Only then does it swap the folder into `public/`. The version it replaced stays in `_publish/` as `v<N>.previous` until the next publish. Files under `/play/worlds` are revalidated on every load, because `v<N>` is republished in place.

Source models that must survive a reboot live in `tools/play/assets/`, with their licence file beside them. Paths in the world config are relative to the repo root.

4. Add `"world_version": <N>` to the site's entry in `content/play/sites.json`. The world opens at `/play/<slug>/world`. A new map is a new version folder: set `version` and `previous_version` in the world config, and publish carries the actors and audio over from the previous folder without touching it, so a server still running the old build keeps working.

### A map bigger than one cell

The order for a whole map:

```powershell
python tools/play/export_world.py <slug> plan
```

```powershell
python tools/play/build_terrain.py <slug>
```

```powershell
python tools/play/export_world.py <slug> estimate --cell all --samples 128
```

```powershell
python tools/play/export_world.py <slug> bake --cell <id> --samples 128
```

```powershell
python tools/play/compose_world.py tools/play/out/world/<id> --fill 0.05
```

```powershell
python tools/play/export_world.py <slug> cards --list-only
```

```powershell
python tools/play/export_world.py <slug> publish
```

`plan` and `cards --list-only` use the CPU only and take no lock. `plan` writes the fort as triangles, and `build_terrain.py` turns them into the height map every cell's ground, colliders and walk rules come from. `--fill` lifts deep shade by a share of the median light. Use `--fill-groups` to limit it, so a cell you are not rebaking keeps its look.

What the world config holds for this:

| Key | Meaning |
|---|---|
| `cells.<id>.bounds` | The cell's rectangle. Cells must not overlap |
| `cells.<id>.keep` | Never unloaded. The start cell has it |
| `groups.<g>.clip`, `clip_bounds` | Keep only triangles inside the cell, or inside these bounds |
| `groups.<g>.hi_match` | Bake against more than the group keeps, so neighbours still cast shadows on it |
| `web.defer` | Loaded after the first view, so it costs the first playable nothing |
| `web.ring` | A coarse layer of the whole map. It is cut away wherever a cell's full detail is standing |
| `web.mode` | `both` shows the group in both eras from one bake |
| `web.collide_era` | Which era its colliders belong to: `then`, `now` or `both` |
| `edits` | In-memory changes to the scene: `remove_faces`, `keep_inside`, `passages`, `walk_strips`, `ramps`, `causeways`. The `.blend` is never saved |
| `terrain` | Height map bounds, which objects are ground, `no_walk` objects, `min_walk_y` (below it a person may not stand), `limit` (the map's edge, a set distance outside a named wall) |
| `today` | Streets and generated city blocks. Blocks avoid the `clear` rectangles and the streets |
| `people` | Routes. A third coordinate puts a route on a structure, as for sentries on a wall. The walkers in the quality preset are shared out among the routes nearest the player |
| `water` | Still water in the past era: `objects` (a pattern for flat source objects, one outline per connected piece), `level`, `rim_top`, `rim_base`, `rim_width`, `keep_out`, `deep`, `shallow`, `stone`, and the `fact` that backs it |

After any change to walls or ground, publish, map the connected ground from the running game, and publish again. A player being placed is only ever put on this ground:

```powershell
$env:PLAY_BASE="http://localhost:3140"; node docs/play/lighthouse/scripts/world-reach.mjs
```

```powershell
python tools/play/export_world.py <slug> publish
```

The runtime loads cells within the preset's `stream` radius, nearest first, and unloads them 70 m past it. Colliders are built one piece per frame, and a cell counts as ready only when all of them exist. Until then the player is held at its edge, so nobody can walk onto ground with no collider. Check a map with:

```powershell
$env:PLAY_BASE="http://localhost:3140"; node docs/play/lighthouse/scripts/world-route.mjs <outDir> --preset high
```

It walks the route with the keyboard, tests the ditch, the map edge and the cart, and takes the screenshots.

`missions.json` also needs four top-level fields, which the validator requires:

| Field | Meaning |
|---|---|
| `title` | The game's name on its menu |
| `tagline` | One short line under the title |
| `eras` | `{ "past": "<era id>" }`. Any other era id counts as today |
| `credits` | The lines the game's Credits view shows. Keep them matching `docs/play/CREDITS.md` |

## Add a mission

Add an entry to `missions` in `missions.json`: `id`, `n`, `title`, `era`, `place_line`, `chapter`, `start`, `objectives`, and optionally `end`. Objective kinds:

| Kind | Fields | Done when |
|---|---|---|
| `goto` | `at`, `radius` | The player arrives |
| `story` | `beats` | The story beats have played |
| `talk` | `npc` | The dialogue has played |
| `record` | `record` | The record has been read |
| `ride` | `ride`, `at`, `radius` | The player arrives riding it |
| `choice` | `beat` | An accepted option is picked |
| `restore` | `classes`, `slot` | The restoration has finished |
| `era` | `to` | The era shift has finished |

Story beats are referenced by id from `story.json` and never copied, so facts, tiers and hedges stay in one place.

## Add an NPC and their lines

Add the figure to `npcs` (`id`, `role`, `figure`, `at`, `face_deg`, `dialogue`), give the id a voice under `voices`, and write its lines under `dialogue`. Rules the validator enforces:

- A line that states a fact has `facts` with ids from `story.json` or `world_facts`.
- A line with no fact id holds no number, year or date, and names no real person.
- Real people are never speakers. Their records are `records`, read by the narrator.

Render and check the voices:

```powershell
tools/play/voice/.venv/Scripts/python tools/play/voice/render_world.py
```

```powershell
node scripts/play/validate-missions.mjs
```

## Add a ride

A ride is data in two files, and the engine has no code for any one animal.

1. **The model.** A static model such as a cart goes in `actors` with `kind: "prop"`. An animal needs a rig first: write `tools/play/rides/<id>.json` (source file, real-world `scale`, triangle budget, the four feet, the spine and neck points, any tail or trunk chains, the seat, and the clips), then run the rigger. It uses the CPU only and only reads the source.

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.3\blender.exe" -b --factory-startup --python tools/play/blender/rig_ride.py -- --spec tools/play/rides/<id>.json --debug tools/play/out/rides/check
```

Open the check renders. The rigger writes `tools/play/out/rides/<id>_rigged.glb`, and a JSON with the footprint (`half`), the seat and the ground speed of each clip. Add it to `actors` with `kind: "rigged"`, then pack it into the live version:

```powershell
node tools/play/pack_actors.mjs <slug> --only <id> --version <N>
```

2. **`web_actors.rides.<type>` in the world config:**

| Key | Meaning |
|---|---|
| `id`, `yaw`, `seat` | The packed model, its turn so it faces forward, and the seat offset |
| `lazy` | Fetch the model only when the player is within `ride_load_m`, so it is not in the first playable |
| `half`, `top` | Half width and half length of the footprint, and how tall it is for walls and arches |
| `zone` | A name in `web_actors.ride_zones` |
| `walk`, `speed`, `accel`, `turn`, `pivot` | Walking speed, top speed with run held, how fast it gets there, turn rate, and how much of it remains at a standstill |
| `pose` | Directions for thigh, shin and foot, so the rider sits astride rather than on a chair |
| `cam` | `height`, `dist` and `dist_portrait` of the camera while riding |
| `sound` | `hoof` or `elephant`: footfalls generated in the browser |

3. **Where it may go.** `ride_zones.<name>` holds `allow` (the whole footprint must be inside one of these polygons) and `deny` (no part may be inside any of them), in Blender metres. Every ride, zone or not, also stops at the `no_ride` rectangles, the map's edge, an unloaded cell, water, anything below `min_walk_y`, walls, and ground steeper than 1 in 5 along its length. It brakes for all of these and for anyone ahead, comes to rest 1.6 m short of a person, and never brings its footprint within 0.5 m of one.

4. **`rides` in `missions.json`:** `id`, `type`, `at`, `face_deg`, `label`. Optional: `note_facts`, `keys` and `keys_touch` (an extra control hint), `notice` (`text` and `tier`, shown while near or riding it, for a ride that is our reconstruction), and `credit` (added to the Credits view).

Publish, or if only ride data changed, update `actors` in the published `world.json` and copy `missions.json`. Publish ships the files `world.json` and `missions.json` reference, plus **every dialogue clip in `tools/play/assets/world_voice/<slug>/`**, so lines rendered for a mission not merged yet survive it. Keep new clips in that folder. Any other file nothing references is dropped from the version folder. Then prove it:

```powershell
$env:PLAY_BASE="http://localhost:3140"; node docs/play/lighthouse/scripts/world-rides.mjs <outDir> --preset high
```

```powershell
$env:PLAY_BASE="http://localhost:3140"; node docs/play/lighthouse/scripts/world-rides.mjs <outDir> --preset low --input touch --tests-only
```

```powershell
$env:PLAY_BASE="http://localhost:3140"; node docs/play/lighthouse/scripts/world-rides.mjs <outDir> --preset high --input gamepad --tests-only
```

It drives each ride at each limit and at people with the chosen device, checks every pose against the world data at 20 cm spacing, checks a ride's notice stays on screen, tests boarding and leaving, and on the keyboard run takes the screenshots. `--only <text>` runs just the drives whose label contains that text. The test sets each ride down by hand, which a player cannot do, so it can land beside someone. That person counts against the 0.5 m limit only if the gap then closes. Its list of test positions is for this map.
