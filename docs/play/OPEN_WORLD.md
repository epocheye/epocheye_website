# Epocheye Play, open world: how it works

Draft during Phase 1. The commands below are the ones in use; sections on Phase 2 features are added as they land.

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

4. Add `"world_version": 1` to the site's entry in `content/play/sites.json`. The world opens at `/play/<slug>/world`.

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

Add the model to `actors` in the world config (`kind: "prop"`) and to `web_actors.rides` (scale, yaw, seat), then add an entry to `rides` in `missions.json`. Areas a ride may never enter are the `no_ride` rectangles in the world config. A ride stops for anyone in its path, and people step aside.
