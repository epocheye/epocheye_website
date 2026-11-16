# Placeholder voice bake-off

Date: 2026-11-16. Machine: Windows 11, CPU only (the GPU was rendering in Blender and was never
used). Site: `tipu-summer-palace-bengaluru`. Lines: the Prologue, 13 clips.

Everything below is a measurement. **Nobody has listened to any of these clips.** The checks
cannot tell whether a voice is warm, calm or pleasant. They can tell whether the words come
out as written, at what pace, and at what level. The choice by ear is the owner's, at GATE 1.

## The three candidates

| Voice | Engine and model | Accent | Licence | Audio |
|---|---|---|---|---|
| `kokoro-heart` | Kokoro-82M, voice pack `af_heart` | American English, female | Apache-2.0 | `audio/kokoro-heart/` |
| `melo-india` | MeloTTS-English, speaker `EN_INDIA` | Indian English | MIT | `audio/melo-india/` |
| `piper-ljspeech` | Piper, `en_US-ljspeech-high` | American English, female | Voice: public domain dataset, MIT repository. Engine GPL-3.0-or-later, local tool only | `audio/piper-ljspeech/` |

Paths are under `public/play/packs/tipu-summer-palace-bengaluru/v1/`. Each folder has the 13
Prologue clips, a `manifest.json` and `_names_reel.m4a`. Sources and dates for every licence:
`LICENSES.md`.

Why these three:

- **Kokoro** has no Indian English voice (American and British only). `af_heart` is the voice
  its own authors grade highest (A in `VOICES.md`). No other Kokoro voice was measured.
- **MeloTTS** has the only Indian English voice found under a clear licence. It is a speaker
  inside the published model, not an accent applied here.
- **Chatterbox was dropped**, so Piper took its place. Chatterbox is a cloning model, and with
  no audio prompt it runs from a stored speaker conditioning whose only stated source is
  "freely available data on the internet". No licence or consent for that speaker is
  published. It was not installed. Details in `LICENSES.md`.
- **Piper** `en_US-ljspeech-high` is trained from scratch on a public domain dataset. Piper's
  VCTK voice, which was considered for Indian-accented speakers, was rejected: it is
  fine-tuned from a research-only model.

## Results side by side (Prologue, 13 clips, first render of each voice)

| Check | `kokoro-heart` | `piper-ljspeech` | `melo-india` |
|---|---|---|---|
| Round trip, heard word for word by `small.en` | **13 of 13** | 11 of 13 | 8 of 13 |
| ...more by `base.en` only | 0 | 1 | 1 |
| ...by neither recogniser | **0** | 1 | 4 |
| Names in clips (Tipu Sultan, Bangalore) | 2 exact | 2 exact | 2 exact |
| Number or date errors | 0 | 0 | 0 |
| Pace within 12% of target (10 clips checked, 3 short clips exempt) | 7 of 10 | 9 of 10 | **10 of 10** |
| Mean distance from pace target | 9.5% | 2.1% | 0.5% |
| Worst clip against its pace target | +25.7% | +14.2% | 1.6% |
| Engine speed used, median (1.0 is the engine's own rate) | 0.70 | 0.69 | 0.59 |
| Loudness spread across clips (target -18 LUFS) | 0.05 LU | 0.18 LU | 0.10 LU |
| Highest true peak (limit -1.5 dBTP) | -2.07 | -1.85 | -1.99 |
| Clipped samples | 0 | 0 | 0 |
| Head silence, ms | 37.9 to 41.9 | 33.9 to 43.9 | 37.9 to 43.9 |
| Tail silence, ms | 42.3 to 59.3 | 37.6 to 59.5 | 41.4 to 62.2 |
| "Listen for" flags | 13 on 7 clips | 6 on 5 clips | 4 on 3 clips |

After the first render, clips that failed the round trip were read again with other random
seeds (up to three), which only does anything for MeloTTS and Piper:

| After retries | `kokoro-heart` | `piper-ljspeech` | `melo-india` |
|---|---|---|---|
| Heard word for word by `small.en` | 13 of 13 | 12 of 13 | 8 of 13 |
| By `base.en` only | 0 | 1 | 3 |
| By neither | 0 | 0 | 2 |

The reports in `reports/` show the state after retries. For `kokoro-heart` the report now
covers all 50 clips, not only the Prologue.

### How far each voice can be slowed (`calibrate.py`)

Fourteen story lines, each read at six engine speeds, and transcribed by both recognisers.
"Heard" means word for word by both.

| Engine speed | `kokoro-heart` short, longer | `piper-ljspeech` short, longer | `melo-india` short, longer |
|---|---|---|---|
| 1.0 | 8 of 8, 6 of 6 | 6 of 8, 4 of 6 | 3 of 8, 3 of 6 |
| 0.9 | 8 of 8, 5 of 6 | 6 of 8, 5 of 6 | 4 of 8, 2 of 6 |
| 0.8 | 6 of 8, 5 of 6 | 5 of 8, 4 of 6 | 4 of 8, 4 of 6 |
| 0.7 | 2 of 8, 5 of 6 | 5 of 8, 5 of 6 | 5 of 8, 4 of 6 |
| 0.6 | 0 of 8, 4 of 6 | 7 of 8, 5 of 6 | 6 of 8, 3 of 6 |
| 0.5 | 0 of 8, 3 of 6 | 6 of 8, 5 of 6 | 4 of 8, 3 of 6 |
| Median pace of the longer lines at 1.0 | 195 wpm | 184 wpm | 194 wpm |

Short = lines of 1 to 3 words. Raw data: `reports/speed_probe_<voice>.json`.

- **Kokoro degrades when slowed.** Below about 0.9 on short lines, and below about 0.7 on
  longer ones, both recognisers start to hear an extra first word ("and dark wood", "a stone
  below"). The waveform shows an uneven start to the first sound at those speeds. So
  `voices.json` holds Kokoro to 0.9 on short lines and 0.7 on the rest.
- **Piper and MeloTTS do not get worse when slowed**, down to 0.5, the lowest speed tried.
  Their scores move up and down with no trend. They are held to 0.5.
- At their own rate all three read these lines at about 185 to 195 words a minute, against
  targets of 150 and 125. Every voice has to be slowed a great deal to meet the brief.

## Which voice Chapter 1 is in, and why

**`kokoro-heart`.** The rule given was: round-trip accuracy first, then pace, then fewest flags.

1. Round trip: Kokoro 13 of 13 on the first render. Piper 11, MeloTTS 8. The speed probe agrees:
   at the engines' own rate, 14 of 14, 10 of 14 and 6 of 14.
2. Pace would have chosen differently: MeloTTS 10 of 10, Piper 9 of 10, Kokoro 7 of 10. It is
   the second criterion, so it did not decide.
3. Flags: not reached.

Chapter 1 (34 clips) and the preview chapter (3 clips) are rendered in `kokoro-heart`, and it
is the default in `audio/voices.json`. Measured over all 50 Kokoro clips:

| Check | Result |
|---|---|
| Round trip | 49 of 50 word for word by `small.en`. 1 by `base.en` only (`c1-e2`, "bases" heard as "Basis"). 0 by neither. |
| Names in clips | 7 exact, 2 with another spelling ("Heider Ali's", "Chikadevaraja Wadiar"), 0 not recognised |
| Dates and numbers | 0 errors (1781, 1791, 1770s, 1800, 1794 all heard as written) |
| Pace | 36 of 42 within 12%. All 29 steady and brisk lines are in. 6 of the 13 slow lines are out, by 19% to 32% |
| Short clips exempt from the pace check | 8, none sped up |
| Loudness | -18.56 to -18.03 LUFS, spread 0.53 LU |
| True peak | highest -1.94 dBTP, no clipped samples |
| Edges | head 35.9 to 43.9 ms, tail 35.7 to 62.8 ms |

One clip needed a second attempt. `c1-C-1-2` ("Mud in the walls.") was heard with an extra
first word at engine speed 0.72. Its speed floor was raised to 0.85 for that clip only
(`clip_overrides` in `voices.json`); both recognisers now hear it word for word, 10.5% over
its pace.

`check.py --voice kokoro-heart` exits 1, because of the six slow lines that are out of pace.

## What the owner should listen for

**The pace of slow lines in Kokoro.** These six run at about 150 to 165 words a minute where
the brief asks for 125: `p-03` "Here is what the front does not tell you.", `p-08` "So what
was there to envy?", `p-11` "You may only use what you can prove.", `c1-q` "What is this palace
made of?", `c1-C-2` "The mud is in the walls.", `c1-C-3-2` "Keep that in mind. You will need
it." Several are marked moments in 8.11. They are as slow as Kokoro goes before its speech
degrades, plus the full 0.85 time-stretch. The pauses after them are untouched and exact.
If they feel rushed, the choices are: accept it for a placeholder; lengthen the pause after
them in `story.json`; or choose a voice that slows cleanly (Piper, MeloTTS).

**Whether slowed speech sounds natural at all.** To reach the brief's pace every voice is
running at 60 to 75% of its own rate, and many clips also carry a 15% time-stretch (flagged
per clip in each report). Measurement cannot say whether that sounds unhurried or dragged.
This matters more than which voice is chosen. If it drags, raise the targets in 8.11.

**Short lines.** "Look around." "Dark wood." "Faded walls." "He said mud." "Who is right?"
"Stone below." "The walls. Mud." "Composed of mud." These have no pace target. In Kokoro
they are read at 0.9 of its own rate, which is faster relative to the lines around them than
8.11 rule 10 ("short lines are not rushed") may want. Kokoro could not go slower without the
extra-sound problem. Listen to `p-07`, `p-07-2`, `p-07-3` in a row with their pauses.

**Starts of clips in Kokoro.** The fault found when Kokoro is slowed is at the first sound.
The floors were set where the recognisers stop hearing it, which is not proof that an ear
will not. Clips at the floor are flagged "engine speed at the voice's limit" in the report.

**MeloTTS and the recognisers.** `melo-india` is the only Indian English voice and it scored
lowest on the round trip. The recognisers are English-only Whisper models and may simply be
worse at Indian English. "front" was heard as "friend" on the first render and again after
three other seeds. "Dark wood" was not recognised at any speed or seed tried. That could be
the voice or the recogniser. Only listening settles it.
If the owner wants the Indian English voice, these two clips are the ones to check first:
`p-03`, `p-07-2`. MeloTTS met every pace target.

**Names.** No name in a clip failed. But a recogniser cannot confirm a vowel or a stress, and
the intended pronunciations in `lexicon.json` are a best understanding, not verified. The
names reel is the real check. Listen first to:

- **Tipu**: overridden from TIP-oo to TEE-poo in all three voices.
- **Sultan**: left as the English dictionary word, SUL-tun. In India it is usually sool-TAHN.
- **Bowring**: no source found for BOH-ring against BOW-ring. Engines say BOH-ring.
- **Chikka Devaraja Wadiyar, Kote Venkataramana, Attara Kacheri, Srirangapatna, Kempe
  Gowda**: all rewritten in the lexicon from wrong engine defaults.
- **Mysore**: Piper's text front end puts the stress on the first syllable (MY-sor). Kokoro's
  and MeloTTS's put it on the second (my-SOR).
- In the Kokoro reel, both recognisers wrote an extra syllable before "Buchanan"
  ("a Buchanan", "Abucannon").
- In isolation the recognisers did not recognise several names in the Piper and MeloTTS reels
  (tables at the end of each report). For one unfamiliar word with no sentence around it that
  is weak evidence either way.

**"bases"** in `c1-e2` ("The pillar bases and the platform. Stone."): one recogniser wrote
"Basis". The two words sound alike. Check it reads as the plural of base.

**Loud peaks.** A few clips needed more than 3 dB of peak limiting (listed per report, for
example Kokoro `c1-A-1`, 4.8 dB). Listen for a click or a hard consonant there.

## Not done

- Only the Prologue is rendered in `melo-india` and `piper-ljspeech`. To hear Chapter 1 in
  either: `python tools/play/voice/render.py --voice <name>`.
- Only one voice per engine was measured. Other Kokoro packs (British `bf_emma`, `bm_george`),
  the other MeloTTS English speakers and Piper `en_GB-cori-high` are under the same licences
  and can be added to `voices.json`.
- The other three lenses are text only, as the brief says.
