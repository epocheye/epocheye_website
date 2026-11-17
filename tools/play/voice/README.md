# Narration pipeline (`tools/play/voice`)

Makes the spoken narration for Epocheye Play: **one audio clip per spoken line**, cleaned and
levelled, plus a manifest. The pauses between clips are not in the audio. They are
`pause_after_ms` in `content/play/<site>/story.json`, inserted by the game. That is why the
voice can be swapped, or replaced by a human recording, without touching any timing.

Everything runs locally on **CPU**. The GPU is never used (CUDA is hidden from every process).
Nothing here calls a paid API or clones a voice. This pipeline never writes `story.json`.

## What is where

| Path | What |
|---|---|
| `render.py` | Story lines to clips. Also writes `voice_script.md` and the names reel. |
| `check.py` | Measures every clip: speech-to-text round trip, pace, loudness, peaks, silence. |
| `calibrate.py` | Measures how far a voice can be slowed before its speech gets worse. |
| `voices.json` | The voices that can be rendered, their engine, licence and starting speeds. |
| `lexicon.json` | How each name should be said, per engine. Applied to the engine's text only. |
| `LICENSES.md` | Licence of every model and voice, with the date checked, and the rejected ones. |
| `BAKEOFF.md` | The candidate voices compared by measurement. |
| `voice_script.md` | Recording sheet for a human: every line, id, pace, pause. Generated. |
| `names_reel.md` | Order of the names reel and what each engine was given. Generated. |
| `reports/<voice>.md`, `.json` | Output of `check.py`. `speed_probe_<voice>.json` is the output of `calibrate.py`, `names_<voice>.json` what the names reel was made from. |
| `engines/*_worker.py` | One small program per engine. `render.py` starts the one it needs. |
| `common.py` | Story expansion (mirrors `sayFor` in `lib/play/story/engine.js`), text and audio helpers. |

Audio goes to `public/play/packs/<site>/v1/audio/<voice>/<clip-id>.m4a` with a
`manifest.json` beside it. Scratch files, logs and model downloads go to
`tools/play/out/voice/` (git-ignored).

## Clip ids

Exactly what `sayFor()` in `lib/play/story/engine.js` produces:

- a beat whose `say` is a string: one clip, id = the beat id (`p-01`)
- a beat whose `say` is a list: `p-07`, `p-07-2`, `p-07-3`, ...
- the `after` lines of a choice option are beats with their own ids (`c1-A-1`)
- beats with `"silent": true`, `"ui": true`, or neither `say` nor `text`: no clip
- option texts are never spoken

If `sayFor()` changes, change `say_for()` in `common.py` to match.

## Render

```bash
# every spoken line of the site, in one voice
python tools/play/voice/render.py --voice kokoro-heart

# some chapters, or some clips
python tools/play/voice/render.py --voice kokoro-heart --chapters prologue,ch1,ch2-preview
python tools/play/voice/render.py --voice kokoro-heart --only p-03,c1-q
python tools/play/voice/render.py --voice kokoro-heart --force        # ignore what is already rendered

python tools/play/voice/render.py --voice kokoro-heart --names-reel   # audio/<voice>/_names_reel.m4a
python tools/play/voice/render.py --script-only                       # voice_script.md
python tools/play/voice/render.py --list                              # voices
```

A clip is rendered again only if its line, pace, lexicon entry or voice settings changed.
Changing only `pause_after_ms` in the story never re-renders audio.

What happens to each line:

1. The lexicon is applied to a copy of the text. The manifest keeps the original text.
2. The engine reads it. The clip is measured. If it is outside its pace, the engine reads it
   again at another speed, up to five times (steady about 150 words a minute, slow about 125,
   brisk about 170).
3. Any small remainder is corrected with ffmpeg `atempo`, kept between 0.85 and 1.15.
4. Clips of 1 to 3 words have no pace target. They are read once at the voice's usual speed
   for that pace and never time-stretched.
5. Silence is trimmed to about 40 ms at head and tail, with 8 ms fades.
6. Loudness is set to -18 LUFS (gated BS.1770 when the clip has at least a second of speech,
   K-weighted RMS of the speech when it is shorter), with a limiter holding peaks under
   -2 dBFS before encoding so the decoded file stays under -1.5 dBTP.
7. Encoded as AAC, mono, 44.1 kHz, 96 kbps, `.m4a`.

`manifest.json` lists for each clip: `id`, `text`, `pace`, `pause_after_ms`, `duration_ms`,
`words`, `wpm`, and how it was made (`engine_speed`, `atempo`, `loudness_lufs`, `true_peak_db`,
`key`). An entry gets `"stale": true` when its line has changed in the story and the clip has
not been rendered again; the player (`lib/play/audio.js`) then skips that clip.

Every render also rewrites `audio/voices.json`, the list of voice folders the player reads,
with a `default`. The default is the voice with the most clips unless one was chosen:

```bash
python tools/play/voice/render.py --voice kokoro-heart --make-default
```

## Check

```bash
python tools/play/voice/check.py --voice kokoro-heart
python tools/play/voice/check.py --voice kokoro-heart --chapters prologue
```

Writes `reports/<voice>.md` (failures first) and `reports/<voice>.json`. Exit code 1 if any
clip fails. A clip fails when:

- neither recogniser (faster-whisper `small.en`, then `base.en`) hears the line word for word
  after normalising case, punctuation and numbers ("seventeen eighty one" equals "1781");
- it is more than 12% off its pace target (clips of 1 to 3 words are exempt);
- its loudness is more than 1 LU from -18 (1.5 for clips under a second);
- its true peak is above -1.5 dBTP, or any sample is clipped;
- its head or tail silence is outside 15 to 90 ms;
- its line changed in `story.json` after it was rendered.

A name counts as heard if the recogniser wrote it as the story spells it (**exact**) or with
another spelling that has the same consonants, such as "Haider Ali" (**close**). A close match
says nothing about vowels or stress. Only a person listening can pass a name. That is what the
names reel is for.

`check.py` measures. It cannot tell whether a voice sounds good, and nothing in the reports
should be read that way.

### When a clip fails the round trip

1. If a **name** is wrong, correct `lexicon.json` and render again (see Names below).
2. Otherwise read the line again with another random seed. MeloTTS and Piper sample randomly,
   so a second reading differs. Kokoro does not, so this does nothing for Kokoro.

   ```bash
   python tools/play/voice/render.py --voice piper-ljspeech --retry-failed   # next seed for every failed clip
   python tools/play/voice/check.py  --voice piper-ljspeech
   ```

   At most three other seeds are tried per clip. After that the clip is an open issue: listen
   to it, and if it is wrong, reshape the line's `say` in `story.json`.
3. Very short clips (one or two words) are where the recognisers are least reliable. A failure
   there means "listen to this one", not "this one is wrong".

## Pace, and how slow a voice can go

The brief's targets (150 / 125 / 170 words a minute per clip) are far below the rate these
engines read a short line at (roughly 180 to 280). Each engine has a speed control, and
slowing it is how the targets are reached. It is not free: below some speed the start of a
clip degrades and the recognisers begin to hear an extra word.

```bash
python tools/play/voice/calibrate.py --voice kokoro-heart
```

reads a fixed set of story lines at speeds from 0.5 to 1.0 and reports how many are heard
word for word at each. The result goes to `reports/speed_probe_<voice>.json`, and the
lowest safe speed goes into `voices.json` as `speed.min` for that voice. `render.py` never
goes below it. A clip that still cannot reach its target is rendered as slow as the floor and
the 0.85 time-stretch allow, and `check.py` reports it as out of pace. The order of
priorities is the brief's: the words must be right first, the pace second.

If one clip still fails its round trip at the voice's floor, raise the floor for that clip
alone with `clip_overrides` in the voice's entry in `voices.json`
(`"clip_overrides": { "c1-C-1-2": { "min": 0.85, "why": "..." } }`). Only that clip is
rendered again.

## Swap the voice

```bash
python tools/play/voice/render.py --voice melo-india
python tools/play/voice/check.py  --voice melo-india
```

That writes a second folder, `audio/melo-india/`, with the same clip ids, and lists it in
`audio/voices.json`. Add `--make-default` to the render command to make the player start with
it. No timing data changes: pauses live in `story.json`, and the player takes each clip's
length from the audio itself.

To add a voice, add an entry to `voices.json` (engine, the worker's arguments, starting
speeds) and record its licence in `LICENSES.md` first.

## Drop in human recordings

1. `python tools/play/voice/render.py --script-only` and give the reader `voice_script.md`.
2. Record one file per row, named by clip id.
3. Convert each to the pack format, into a new voice folder, for example `audio/human/`:

   ```bash
   ffmpeg -i p-01.wav -af "loudnorm=I=-18:TP=-1.5:LRA=11" -ac 1 -ar 44100 -c:a aac -b:a 96k \
     public/play/packs/tipu-summer-palace-bengaluru/v1/audio/human/p-01.m4a
   ```

   Trim each file to about 40 ms of silence at head and tail before converting. Do not leave
   pauses in the recording: the game adds them.
4. Same ids, same folder layout, so the player needs only the folder name. `check.py` reads a
   manifest, which `render.py` writes; for a human folder there is none yet, so the checks do
   not run on it. `[SAMBIT: say if you want a --from-recordings mode that builds the manifest and runs the same checks on recorded files.]`

## Names

`lexicon.json` holds one entry per name, with an `intended` pronunciation in plain respelling
and, per word, what each engine should be given (`kokoro_a`, `kokoro_b`, `arpabet` for MeloTTS,
`espeak` for Piper, or a plain `respell`). A word with no entry is read as the engine reads it.
To correct a name: edit the entry, then

```bash
python tools/play/voice/render.py --voice <name>                # re-renders only the lines with that name
python tools/play/voice/render.py --voice <name> --names-reel
python tools/play/voice/check.py  --voice <name>
```

## Setup (once per machine)

Python 3.11 is needed: Kokoro and MeloTTS do not install on 3.13. `uv` fetches it.

```bash
cd tools/play/voice
pip install uv            # or use a throwaway venv, as was done here

# .venv: pipeline, Kokoro, Piper, faster-whisper
uv venv --python 3.11 .venv
uv pip install --python .venv/Scripts/python.exe "kokoro>=0.9.4" "misaki[en]" soundfile numpy scipy pyloudnorm faster-whisper piper-tts \
  "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"

# .venv-melo: MeloTTS wants older versions of the same libraries, so it has its own
uv venv --python 3.11 .venv-melo
uv pip install --python .venv-melo/Scripts/python.exe "git+https://github.com/myshell-ai/MeloTTS.git" "numpy<2" "setuptools<81" soundfile

# Piper voices
.venv/Scripts/python.exe -m piper.download_voices en_US-ljspeech-high --data-dir ../out/voice/models/piper
```

`python tools/play/voice/render.py ...` can be run with any Python: the scripts restart
themselves inside `.venv`, and start each engine in its own environment.

Notes from this machine (Windows 11, 2026-11-16):

- MeloTTS imports its Japanese module at start-up, which needs a 500 MB dictionary. The worker
  replaces the non-English language modules with empty stand-ins instead. English is untouched.
- MeloTTS reads the "s" of a possessive ("Sultan's") as a separate letter unless the word is
  kept whole. The worker handles that.
- The first MeloTTS run downloads NLTK data. If it lands in `%APPDATA%\nltk_data`, move it to
  `tools/play/out/voice/models/nltk`, where the workers look first.
- Model downloads, as measured here: Kokoro 314 MB, MeloTTS English 199 MB plus BERT 421 MB,
  one Piper voice 109 MB, the two recognisers 464 MB and 141 MB, NLTK data 20 MB. All under
  `tools/play/out/voice/models`.
- The engines are limited to 4 threads each (`PLAY_VOICE_THREADS` changes that). With a
  render running on the same machine, more threads made everything slower, not faster.
- Kokoro reads the same text the same way every time. MeloTTS is seeded per clip. Piper's
  random sampling is inside its model and is not seeded, so a Piper clip differs a little
  each time it is rendered.
- Changing a voice's entry in `voices.json` re-renders that voice's clips (a `clip_overrides`
  entry re-renders only its own clip).
