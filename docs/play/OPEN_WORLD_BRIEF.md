# EPOCHEYE PLAY, OPEN WORLD: UPGRADE BRIEF

Save as `docs/play/OPEN_WORLD_BRIEF.md` in the website repo. Read all of
it, then `docs/play/PLAY_BRIEF.md` and `docs/play/STATUS.md`, at the start
of every run. The goal only points here.

---

## 0. What we are making and why

Epocheye Play is live at `/play` with the Summer Palace level, "Envy of
Heaven": a node-based story game on photoreal panoramas. We now upgrade it
into an **open-world, third-person story game in the browser**, built to
feel like the big open-world game everyone is playing this month.

The player walks a living world, talks to people, follows a story line of
missions, rides a bullock cart, a horse or an elephant, opens a map, and
restores what was lost. The map is real: **Bangalore Fort and the Summer
Palace, 1 March 1791**, rebuilt from our own research.

**The test:** someone who has played that other game opens ours and
thinks "oh, it's that, but it's India, and it's real". Then they finish
the story knowing the history.

It stays a **web game**. It runs on a phone and on a PC. Players who love
it are asked whether they want it as an app (section 9).

**It is still marketing.** Every session should end in a share, an email,
a vote or an app-interest tap.

---

## 1. What already exists (build on it, do not rebuild it)

### 1.1 The live game (this repo)
- `/play`, the engine in `components/play/engine/` (`PanoViewer`,
  `PieceCanvas`), `content/play/tipu-summer-palace-bengaluru/story.json`
  (40 verified facts, 158 beats), the daily puzzle, votes, leaderboards,
  share cards, email unlock, the Neon `play_` tables, Kokoro narration (188
  clips), the admin page. Stack: Next.js 16, React 19, three 0.167,
  @react-three/fiber 9, drei 10, postprocessing.
- `docs/play/LAUNCH.md` has 16 open items for me. Do not try to close them.

### 1.2 The 1791 world (on disk, read only)
`E:\heritage_assets\tipu-summer-palace-bengaluru\`
- `output\blend\TSP_period_world.blend`: Bangalore Fort and the palace at
  **1 March 1791, 17:10**, low sun from the west north-west. The fort
  circuit, ramparts, gates, outworks, Great Ditch, interior courts, tanks
  and avenue from Mackenzie's 1791 survey; the palace court as Hunter drew
  it in February 1792; tamarind, mango and coconut trees; bullock carts,
  palanquins, awnings, a well, pots and sacks; 35 people in the court and
  sepoys in the fort.
- `output\blend\TSP_period_assumptions.md`: the tier of every element.
- `output\blend\TSP_FORT_joined_story.md`: a walk from outside the Delhi
  Gate to the palace, stop by stop, with tiers.
- `output\blend\palace_COURT_1791.blend`: the court scene.
- `research\`: palace measurements, figure evidence, material sources.
- `assets\tsp_town`, `tsp_court`, `tsp_figures`: figure models.

**Do not use `palace_SIEGE_1791.blend`.** No siege scene, ever.

### 1.3 The story (already written and verified)
The five chapters of "Envy of Heaven" in `story.json` become the
missions. Every fact id, tier and hedge carries over unchanged.

---

## 2. The game design

### 2.1 Who you are
You are **a restorer from today**, carrying an Epocheye. The device lets
you step into 1791, walk the fort, and bring back what was lost. You are
not a character from history, so you never change what happened.

### 2.2 The world
- **The map:** Bangalore Fort and its surroundings in 1791: outside the
  Delhi Gate, the winding approach, the Great Ditch, the rampart walk,
  the avenue, the courts, the palace and its court. Roughly the walk in
  `TSP_FORT_joined_story.md`, made free-roam.
- **Today:** the same ground as it is now, for the first and last
  missions: the palace in its garden, the Delhi Gate on KR Road, the city
  as simple blocks and skyline around it. Switching eras is a big moment
  (2.6).
- **Alive:** people walking set routes, traders at awnings, bullocks
  grazing, birds, dust in the low sun, smoke, flags, water in the tanks.
  Life is what makes an open world feel open.
- **Golden hour, always**, in 1791. Today runs at a different time of day
  so the two eras feel different.

### 2.3 Movement and rides
- Third-person character, walk and run, camera behind the shoulder.
  **PC:** WASD and mouse. **Phone:** a left thumb joystick, drag to look,
  buttons for interact, ride and map. Gamepad if cheap to add.
- **Rides:** walk up and press interact to get on.
  - **Bullock cart:** slow, the main way to cross the fort, the cart
    rocking and creaking. These are already in the world as recorded
    period transport (INFERRED).
  - **Horse:** fast, for the open ground outside the walls.
  - **Elephant:** slow and high, the best view in the game. Only outside
    the palace court and on the main avenue. Label it as our
    reconstruction of court life, not a record.
  - No ride ever goes up the palace steps, onto the platform, into a room
    or through a crowd. People step aside, nobody is ever hit.
- Use CC0 or commercially licensed rigged and animated models for the
  animals and the player, with the licence in `CREDITS.md`. If an animal
  looks stiff, give it fewer, simpler moves rather than ship it ugly.

### 2.4 The story line (missions)
A main story line of six missions, plus side activities. Each mission has
a start marker on the map, a short intro card, objectives, dialogue, a
restoration, and an end splash.

| # | Mission | Era | What you do | From story.json |
|---|---|---|---|---|
| 0 | Nice. Old. | today | Arrive at the palace today. Bare wood, faded walls. The device wakes up | Prologue |
| 1 | Ten Years | 1791 | Find out what the palace is made of: stone, clay, teak. Talk to a carpenter and a mason. Restore slot S1 | Chapter 1 |
| 2 | The Year It Was Finished | 1791 | Find the three spots Lt James Hunter later drew from. Line your view up with his sketch until it locks. Restore the front's colour | Chapter 2 |
| 3 | A Machine for Being Seen | 1791 | Durbar day. Stand in the open court with the people, then climb to the gallery. See that height is rank. Restore the painted, false-gilded halls | Chapter 3 |
| 4 | The Office | 1831 to 1868 | The world shifts: the court is gone, clerks and ledgers fill the rooms. Put the dated records in order | Chapter 4 |
| 5 | What Nobody Wrote Down | today | Back to today. Look up. The empty ceiling. Make the choice. Full reveal | Chapter 5 |

The end of mission 5 is the existing ending: the full reveal, the proof
toggle, the year vote and the "What you now know" card.

**Side activities** (each short, each teaches one sourced fact):
- **Lost records:** collectible pages scattered across the fort (a
  survey sheet, a sketch, a ledger). Each one is a real source from our
  research, with its tier.
- **Ride the circuit:** a timed bullock cart or horse loop of the walls,
  with sourced facts about the gates, the ditch and the towers on the way.
- **Photo mode:** freeze, frame, add a filter, share. Every shared image
  carries the Epocheye mark and a link back.
- **The daily Missing Piece** opens from the map.

### 2.5 Dialogue: how people talk
This is where players learn. It must be good and it must be true.
- **Role figures talk:** a carpenter, a mason, a grain trader, a sepoy on
  the wall, a palanquin bearer, a clerk in 1831. Short, human, specific
  lines. Every line that states a fact carries a fact id from
  `story.json` or from the 1791 world's research files. Lines with no
  fact (greetings, jokes, "watch your step") are allowed and carry no id.
- **Real people never speak invented words.** Hunter and Buchanan were not
  in Bangalore on 1 March 1791, so they do not appear as people. Their
  records appear as objects you find (Hunter's sketch, Buchanan's
  journal), read in the narrator's voice, with short quotes where
  `story.json` has them.
- **Tipu Sultan** may appear only at a distance, on the balcony during
  the durbar, exactly as Buchanan's account arranges the court. He never
  speaks, is never close up, is never hero or villain. The palace leads.
- No invented names for real people. Role figures have role names ("the
  mason").
- Dialogue shows as subtitles first, with voice. Use Kokoro voices, a few
  distinct Indian English voices for the roles, the existing narrator for
  records. Same pacing rules as `PLAY_BRIEF.md` 8.11.
- Player choices in dialogue are the evidence choices already in the
  story. They never change history.

### 2.6 Era shifts
The move between today and 1791 is the signature moment, like a big
transition in that other game. A held breath, the world dissolving
outward from the player, colour flooding in, sound changing from traffic
to birds and voices. Under 3 seconds. Same in reverse.

### 2.7 What it must never do
- No weapons, combat, police, chases, theft, money or death. No siege
  scene. The fall of the fort on 21 March 1791 is one line of text, never
  shown.
- Nobody is hurt. Rides cannot hit people.
- No climbing on or touching carving. No entering a sanctum.
- No invented history, figures, inscriptions or quotes. Every fact keeps
  its tier and the narration hedges word for word.
- No prices anywhere.

---

## 3. The look and feel

### 3.1 Honest about the graphics
A browser on a mid-range phone cannot match a console game's graphics.
Do not try and fail. **Aim for the best-looking web game a player has
seen**, using:
- Baked lighting from our Blender world (lightmaps and AO baked in
  Blender, headless), not real-time shadows everywhere.
- One real-time sun shadow near the player only.
- Post-processing: filmic tonemapping, a warm colour grade (a LUT), soft
  bloom on the sun and highlights, light haze with distance, subtle
  vignette. Lower on phones, higher on PCs.
- Instanced trees, people and props; level of detail on everything;
  KTX2 textures; meshopt geometry.
- Quality presets: Low, Medium, High, chosen automatically from the
  device, changeable in settings.

### 3.2 The open-world feel
- **Palette:** hot sunset pinks, oranges and purples, teal skies at
  dawn. Lean into it in the grade, the UI and the cards.
- **HUD:** circular minimap bottom left with the player arrow, mission
  markers, ride icons and record icons; objective line; waypoint marker in
  the world; a full-screen map with fast travel to places you have
  visited.
- **Mission intro card:** big bold title, era and place under it,
  slow-motion freeze of the world behind.
- **End splash:** "MONUMENT RESTORED", the place and year, a gold flash,
  a counter.
- **Font:** a big, bold, condensed display face for titles and splashes.
  Pricedown's free licence covers video only, not games or webfonts. So
  either **I buy the Typodermic licence that covers games and web**
  `[SAMBIT: buy it, or say no]`, or use an open-licence (OFL) display
  font with the same punch. Until I answer, use the OFL font.
- **Never** the GTA name, logo, boxed logo lockup, "VI" numerals, music,
  sound effects or on-screen phrases. The vibe, not their property.

### 3.3 Sound
Ambience per area (market, court, ramparts, today's traffic), footsteps
on earth and stone, bullock bells, horse hooves, elephant, birds. One
licensed music track for the menu and the era shift. Everything licensed
for commercial use, in `CREDITS.md`.

---

## 4. Tech

- Build on the repo's stack: React Three Fiber, drei, postprocessing.
  Add **Rapier** (`@react-three/rapier`) for physics and a character
  controller. Check every new package's licence.
- **Asset pipeline:** a script `tools/play/export_world.py` runs Blender
  headless (`blender.exe -b -P`) on `TSP_period_world.blend`, read only,
  and writes web assets: split into streamable cells, LODs, baked
  lightmaps, collision meshes, KTX2 and meshopt, a `world.json` with
  spawn points, NPC routes, ride spawns, mission markers and era
  variants. Never use an open Blender window or its connector. Take
  `E:\konark\locks\gpu.lock` and check `nvidia-smi` before bakes; estimate
  bake hours first.
- **Budgets:** first playable under **8 MB** and under **8 seconds** on a
  mid-range Android over 4G. Whole world streamed, under **40 MB**.
  **30 fps** on a mid-range Android on Low, **60 fps** on a mid-range PC
  on High.
- One engine for any site, driven by `world.json` plus `story.json`. No
  site-specific code, same as the existing pack format.
- Save progress locally after every objective. Works without an account.
- Reuse the existing backend, share cards, votes, leaderboards and admin.
  New tables only by migration, touching nothing else.
- **Mission 2's sketch match:** show Hunter's sketch as a ghost overlay
  and score how closely the player's camera matches its viewpoint. The
  sketch is CC0 (Yale B1974.12.1168), so it can be shown.

---

## 5. The existing game stays

- The current panorama level becomes **"Story view"**: kept, linked from
  the open world's menu, and the automatic fallback on devices too weak
  for the open world.
- `/play/tipu-summer-palace-bengaluru` opens the open world when the
  device can run it, else Story view. A player can switch either way.
- Do not break the daily puzzle, votes, leaderboards, share cards, email
  unlock or any existing route.

---

## 6. Order of work and gates

Branch `feat/open-world` with a Vercel preview URL. Nothing merges to
`main` without my word.

**Phase 0 (report, no code):** read everything in section 1. Report in
ten lines: what the 1791 world contains and how big it is, the export
plan, the asset licences (figures, animals, player), the device budget
plan, and what you would cut first. Then continue.

**Phase 1, vertical slice:** the palace court and the avenue only, at
1791. Walk and run on a phone and on a PC, the HUD and minimap, people
walking, one bullock cart ride, one dialogue with the carpenter, mission 1
playable start to finish with its restoration and splash, and the era
shift from today into 1791.
**GATE 1: stop and send me** the preview link, a screen recording on a
phone and on a PC, and the frame rate and load time on each. I judge
three things: does it feel like an open-world game, does it look good,
and do I want to keep playing.

**Phase 2:** the whole fort map, all six missions, horse and elephant,
side activities, photo mode, the full-screen map and fast travel, all
dialogue with voices.

**Phase 3:** performance on real budgets, Story view fallback, the app
interest flow (section 9), analytics, share cards for missions and photo
mode.
**GATE 2: stop and send me** the full game on the preview link.

**Phase 4:** polish, bugs, the launch checklist for the open world.
**GATE 3: stop.** I merge it myself.

Outside the gates, do not stop to ask. Take the best labelled choice,
log it in `docs/play/DECISIONS.md`, and keep going. If I do not answer a
gate, write WAITING in `docs/play/STATUS.md` and stop. Never loop.

---

## 7. Rules

- Read only on every file under `E:\heritage_assets\`, `E:\konark\` and
  the shared `pr_kit`. Write only inside this repo and its
  `tools\play\out\`.
- Every new model, animation, sound, font and texture has a licence
  recorded in `CREDITS.md`. Nothing with an unclear licence ships.
- Facts only from `story.json` and the 1791 world's research files, with
  tiers. No invented history, ever.
- No em dashes or en dashes in any player-facing text. Short, plain,
  human lines.
- No prices, traction, funding or user counts.
- Respect `docs/play/LAUNCH.md` and `PLACEHOLDERS.md`; do not overwrite
  my open decisions.

---

## 8. Done when

- On the preview URL, a player can play the full story line, all six
  missions, in the open world on a phone and on a PC, and ride all three
  rides.
- Budgets in section 4 are met and measured on a real mid-range Android,
  or the gap is reported honestly.
- Every dialogue line that states a fact has a fact id; the validator
  passes with zero errors.
- Story view still works, and every existing route works.
- `CREDITS.md` lists every asset and licence.
- `docs/play/OPEN_WORLD.md` explains how to add a world, add a mission,
  add an NPC and their lines, and add a ride.

---

## 9. "Want this as an app?"

- After the first mission, and again at the end, ask once: **"Want this
  on your phone or PC as an app?"** with two buttons.
- **Yes:** offer to **install it now** as an app from the browser (a
  Progressive Web App: home-screen icon, full screen, works like an app on
  Android, iPhone and PC), and offer an email sign-up to hear when a store
  app is ready. Record the answer.
- Never claim a store app exists. Never put a price on it.
- Track: asked, yes, installed, email given. This is the number I want
  most after completions.
