"""Shared helpers for the Epocheye Play narration pipeline.

Story expansion (mirrors lib/play/story/engine.js sayFor), text normalisation for the
speech-to-text round trip, and the audio measurements used by render.py and check.py.

Nothing here talks to a TTS engine. Engines live in engines/*_worker.py.
"""
from __future__ import annotations

import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SCRATCH = ROOT / "tools" / "play" / "out" / "voice"
MODELS = SCRATCH / "models"
DEFAULT_SITE = "tipu-summer-palace-bengaluru"

SR = 44100
PACE_WPM = {"steady": 150, "slow": 125, "brisk": 170}
PACE_TOLERANCE = 0.12
EXEMPT_MAX_WORDS = 3          # clips of 1 to 3 words: no wpm check, never sped up
TARGET_LUFS = -18.0
SHORT_CLIP_MS = 1000          # under this much speech, loudness is K-weighted RMS, not gated BS.1770
TRUE_PEAK_MAX_DB = -1.5
PRE_ENCODE_PEAK_DB = -2.0     # ceiling before AAC, leaves room for codec overshoot
EDGE_SILENCE_MS = 40
FADE_MS = 8
ATEMPO_MIN, ATEMPO_MAX = 0.85, 1.15


# ----------------------------------------------------------------------------- venv

def venv_python(name: str = ".venv") -> Path:
    return HERE / name / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def ensure_venv() -> None:
    """Re-run the calling script inside tools/play/voice/.venv if it is not already there."""
    py = venv_python()
    if not py.exists():
        sys.exit(f"Missing virtual environment: {py}. See tools/play/voice/README.md (Setup).")
    if Path(sys.prefix).resolve() == py.parents[1].resolve():
        return
    env = dict(os.environ, PYTHONUTF8="1", PYTHONIOENCODING="utf-8", PYTHONUNBUFFERED="1")
    sys.exit(subprocess.call([str(py), *sys.argv], env=env))


def cpu_only_env(extra: dict | None = None) -> dict:
    """Environment for every child process: no GPU, model downloads kept in scratch."""
    env = dict(os.environ)
    env.update({
        "CUDA_VISIBLE_DEVICES": "",
        "HF_HOME": str(MODELS / "hf"),
        "HF_HUB_DISABLE_SYMLINKS_WARNING": "1",
        "HF_HUB_DISABLE_TELEMETRY": "1",
        "NLTK_DATA": str(MODELS / "nltk"),
        "PYTHONUTF8": "1",
        "PYTHONIOENCODING": "utf-8",
        "TOKENIZERS_PARALLELISM": "false",
    })
    # A few threads only: the machine may be rendering at the same time, and a dozen
    # spinning threads per engine makes every process slower.
    threads = os.environ.get("PLAY_VOICE_THREADS", "4")
    env.setdefault("OMP_NUM_THREADS", threads)
    env.setdefault("MKL_NUM_THREADS", threads)
    if extra:
        env.update(extra)
    return env


# ----------------------------------------------------------------------------- story

def story_path(site: str) -> Path:
    return ROOT / "content" / "play" / site / "story.json"


def audio_dir(site: str, voice: str) -> Path:
    return ROOT / "public" / "play" / "packs" / site / "v1" / "audio" / voice


def load_story(site: str) -> dict:
    return json.loads(story_path(site).read_text(encoding="utf-8"))


def text_for(value, lens="traveller", fallback="traveller") -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if lens in value and value[lens] is not None:
        return value[lens]
    if fallback in value and value[fallback] is not None:
        return value[fallback]
    return next(iter(value.values()), "") or ""


def say_for(beat: dict) -> list[dict]:
    """Python port of sayFor() in lib/play/story/engine.js. Keep the two in step.

    One difference, on purpose: beats with "ui": true are never spoken here
    (PLAY_BRIEF 8.11 rule 8, the voice never reads the interface). engine.js leaves
    that decision to its caller.
    """
    if not beat or beat.get("ui"):
        return []
    pause = beat.get("pause_after_ms")
    base = {"pace": beat.get("pace") or "steady", "pause_after_ms": 600 if pause is None else pause}
    say = beat.get("say")
    if isinstance(say, list):
        out = []
        for i, seg in enumerate(say):
            clip = beat["id"] if i == 0 else f"{beat['id']}-{i + 1}"
            out.append({**base, "clip": clip, **seg})
        return out
    if isinstance(say, str):
        return [{**base, "text": say, "clip": beat.get("clip") or beat["id"]}]
    if beat.get("silent") or not beat.get("text"):
        return []
    return [{**base, "text": text_for(beat["text"]), "clip": beat.get("clip") or beat["id"]}]


def word_count(text: str) -> int:
    return len([w for w in str(text or "").strip().split() if w])


def expand_story(story: dict, chapters: list[str] | None = None) -> list[dict]:
    """Every spoken segment, in play order, including the `after` lines of choice options."""
    out: list[dict] = []
    seen: set[str] = set()

    def push(chapter_id: str, beat: dict, parent: str | None, kind: str | None = None):
        for seg in say_for(beat):
            clip = seg["clip"]
            if clip in seen:
                raise ValueError(f"Duplicate clip id in story: {clip}")
            seen.add(clip)
            out.append({
                "id": clip,
                "chapter": chapter_id,
                "beat": beat["id"],
                "type": kind or beat.get("type") or "line",
                "role": beat.get("role"),
                "parent": parent,
                "text": seg["text"],
                "pace": seg.get("pace") or "steady",
                "pause_after_ms": seg.get("pause_after_ms", 600),
                "words": word_count(seg["text"]),
            })
        for opt in beat.get("options") or []:
            for line in opt.get("after") or []:
                push(chapter_id, line, f"{beat['id']}/{opt['id']}", "after")
        # Mirrors walkBeats() in lib/play/story/engine.js: the cards of an order beat speak
        # when they land, and a proof beat's lines play once the switch is pressed.
        for card in beat.get("cards") or []:
            push(chapter_id, card, beat["id"], "gap" if card.get("gap") else "card")
        if beat.get("type") == "proof":
            for line in beat.get("after") or []:
                push(chapter_id, line, beat["id"], "after")

    for ch in story.get("chapters") or []:
        if chapters and ch["id"] not in chapters:
            continue
        for beat in ch.get("beats") or []:
            push(ch["id"], beat, None)
    ending = story.get("ending") or {}
    if ending.get("beats") and (not chapters or "ending" in chapters):
        for beat in ending["beats"]:
            push("ending", beat, None)
    for seg in out:
        if seg["pace"] not in PACE_WPM:
            raise ValueError(f"Unknown pace {seg['pace']!r} on clip {seg['id']}")
    return out


# ----------------------------------------------------------------------------- lexicon

def load_lexicon() -> dict:
    return json.loads((HERE / "lexicon.json").read_text(encoding="utf-8"))


def load_voices() -> dict:
    return json.loads((HERE / "voices.json").read_text(encoding="utf-8"))


def lexicon_words(lexicon: dict) -> dict[str, dict]:
    """word -> per-engine overrides, flattened from every entry."""
    words: dict[str, dict] = {}
    for entry in lexicon["entries"]:
        for word, spec in (entry.get("words") or {}).items():
            words[word] = spec
    return words


def _possessive_suffix(phonemes: str) -> str:
    last = phonemes.rstrip()[-1:] if phonemes.strip() else ""
    return "s" if last in "ptkfθ" else "z"


def apply_lexicon(text: str, lexicon: dict, engine: str, variant: str | None = None) -> tuple[str, dict]:
    """Return (text for the TTS engine, extras for the worker).

    The text shown to players and stored in the manifest is never changed. Per word in
    lexicon.json, the engine's own key is used if present, otherwise "respell":
      kokoro   "kokoro_a" / "kokoro_b" (American / British voices): phonemes in Kokoro's own
               alphabet, sent inline as [Word](/phonemes/)
      melo     "arpabet": ARPAbet with stress digits, injected into MeloTTS's dictionary by
               the worker; the text is left as it is
      piper    "espeak": espeak-ng IPA, sent inline as [[ phonemes ]]
      any      "respell": a plain respelling
    A word with none of these is sent as written.
    """
    words = lexicon_words(lexicon)
    arpabet: dict[str, str] = {}
    out = text
    for word, spec in sorted(words.items(), key=lambda kv: -len(kv[0])):
        pattern = re.compile(rf"(?<![A-Za-z\[/]){re.escape(word)}('s|’s)?(?![A-Za-z\]])")
        if not pattern.search(out):
            continue
        if engine == "melo" and spec.get("arpabet"):
            arpabet[word.upper()] = spec["arpabet"]
            continue
        key = {"kokoro": f"kokoro_{variant}", "piper": "espeak"}.get(engine)
        ph = spec.get(key) if key else None
        if ph and engine == "kokoro":
            def repl(m, ph=ph, word=word):
                if m.group(1):
                    return f"[{word}'s](/{ph}{_possessive_suffix(ph)}/)"
                return f"[{word}](/{ph}/)"
            out = pattern.sub(repl, out)
        elif ph and engine == "piper":
            out = pattern.sub(lambda m, ph=ph: f"[[ {ph}{_possessive_suffix(ph) if m.group(1) else ''} ]]", out)
        elif spec.get("respell"):
            out = pattern.sub(lambda m, r=spec["respell"]: r + (m.group(1) or ""), out)
    if engine == "piper":
        # Piper drops punctuation that directly follows a phoneme block, so move it inside,
        # and join neighbouring blocks so only one space separates the words.
        out = re.sub(r" \]\]([,.;:?!]+)", lambda m: m.group(1) + " ]]", out)
        out = re.sub(r" \]\]\s+\[\[ ", " ", out)
    return out, ({"arpabet": arpabet} if arpabet else {})


def lexicon_names(lexicon: dict) -> list[str]:
    return [e["name"] for e in lexicon["entries"]]


# ----------------------------------------------------------------------------- text normalisation (round trip)

_ONES = {w: i for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
    "fifteen sixteen seventeen eighteen nineteen".split())}
_TENS = {w: (i + 2) * 10 for i, w in enumerate("twenty thirty forty fifty sixty seventy eighty ninety".split())}
_TENS_PLURAL = {w[:-1] + "ies": v for w, v in _TENS.items()}
_ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "seventh": 7, "eighth": 8,
        "ninth": 9, "tenth": 10, "eleventh": 11, "twelfth": 12, "thirteenth": 13, "fourteenth": 14,
        "fifteenth": 15, "sixteenth": 16, "seventeenth": 17, "eighteenth": 18, "nineteenth": 19,
        "twentieth": 20, "thirtieth": 30}
_SPELLING = {"colour": "color", "colours": "colors", "coloured": "colored", "honour": "honor", "grey": "gray",
             "centre": "center", "storey": "story", "storeys": "stories", "ok": "okay"}
BOUNDARY = "|"


def _tokens(text: str) -> list[str]:
    t = text.lower()
    t = t.replace("’", "'").replace("‘", "'")
    t = re.sub(r"(?<=\d),(?=\d{3}\b)", "", t)                 # 1,781 -> 1781
    t = re.sub(r"[.,;:?!]+", f" {BOUNDARY} ", t)
    t = t.replace("-", " ")
    t = t.replace("'", "")
    t = re.sub(rf"[^a-z0-9{re.escape(BOUNDARY)}\s]", " ", t)
    return t.split()


def _group(toks: list[str], i: int) -> tuple[int, int] | None:
    """A number below 100 starting at toks[i]: (value, tokens used)."""
    w = toks[i]
    if w in _ONES:
        return _ONES[w], 1
    if w in _TENS:
        if i + 1 < len(toks) and toks[i + 1] in _ONES and 1 <= _ONES[toks[i + 1]] <= 9:
            return _TENS[w] + _ONES[toks[i + 1]], 2
        return _TENS[w], 1
    return None


def _numbers(toks: list[str]) -> list[str]:
    """Number words to digits. Years read as pairs: seventeen eighty one -> 1781."""
    out: list[str] = []
    i = 0
    n = len(toks)
    while i < n:
        w = toks[i]
        # ordinals: twenty first -> 21th, first -> 1th (same token on both sides of the comparison)
        if w in _TENS and i + 1 < n and toks[i + 1] in _ORD and _ORD[toks[i + 1]] < 10:
            out.append(f"{_TENS[w] + _ORD[toks[i + 1]]}th")
            i += 2
            continue
        if w in _ORD:
            out.append(f"{_ORD[w]}th")
            i += 1
            continue
        m = re.fullmatch(r"(\d+)(st|nd|rd|th)", w)
        if m:
            out.append(f"{m.group(1)}th")
            i += 1
            continue
        g = _group(toks, i)
        if g is None:
            out.append(w)
            i += 1
            continue
        val, used = g
        j = i + used
        nxt = toks[j] if j < n else None
        if 10 <= val <= 99 and nxt in _TENS_PLURAL:            # seventeen seventies -> 1770s
            out.append(f"{val * 100 + _TENS_PLURAL[nxt]}s")
            i = j + 1
            continue
        if nxt == "hundreds" and 1 <= val <= 99:               # eighteen hundreds -> 1800s
            out.append(f"{val * 100}s")
            i = j + 1
            continue
        if nxt == "hundred":
            total = val * 100
            j += 1
            if j < n and toks[j] == "and" and j + 1 < n and _group(toks, j + 1):
                j += 1
            g2 = _group(toks, j) if j < n else None
            if g2:
                total += g2[0]
                j += g2[1]
            out.append(str(total))
            i = j
            continue
        if 10 <= val <= 99 and nxt in ("oh", "o") and j + 1 < n and toks[j + 1] in _ONES and 1 <= _ONES[toks[j + 1]] <= 9:
            out.append(str(val * 100 + _ONES[toks[j + 1]]))    # eighteen oh four -> 1804
            i = j + 2
            continue
        if 10 <= val <= 99 and nxt is not None:
            g2 = _group(toks, j)
            if g2 and 10 <= g2[0] <= 99:                       # seventeen eighty one -> 1781
                out.append(str(val * 100 + g2[0]))
                i = j + g2[1]
                continue
        if nxt == "thousand":
            total = val * 1000
            j += 1
            g2 = _group(toks, j) if j < n else None
            if g2 and j + g2[1] < n and toks[j + g2[1]] == "hundred":
                total += g2[0] * 100
                j += g2[1] + 1
                if j < n and toks[j] == "and":
                    j += 1
                g2 = _group(toks, j) if j < n else None
            if g2:
                total += g2[0]
                j += g2[1]
            out.append(str(total))
            i = j
            continue
        out.append(str(val))
        i = j
    return out


def normalise(text: str) -> list[str]:
    """Lower case, no punctuation, numbers as digits, one spelling. Used on both sides."""
    toks = _numbers(_tokens(text))
    return [_SPELLING.get(t, t) for t in toks if t != BOUNDARY]


def is_number_token(tok: str) -> bool:
    return bool(re.fullmatch(r"\d+(s|th)?", tok))


def skeleton(s: str) -> str:
    """Consonant skeleton of a name, for a spelling-tolerant comparison of what the
    recogniser heard. It cannot tell vowels or stress apart, so a skeleton match is weaker
    evidence than an exact match."""
    s = re.sub(r"[^a-z]", "", s.lower())
    for a, b in (("tch", "C"), ("ch", "C"), ("sh", "S"), ("ph", "f"), ("th", "t"), ("ck", "k"), ("gh", "g")):
        s = s.replace(a, b)
    s = s.translate(str.maketrans({"c": "k", "q": "k", "z": "s", "w": "v", "y": "", "x": "ks", "j": "g"}))
    s = re.sub(r"[aeiouh]", "", s)
    return re.sub(r"(.)\1+", r"\1", s)


_FUNCTION_WORDS = set("the a an of in on at to and or his her its their this that is was it he she as by for with had has".split())


def match_names(ref: list[str], hyp: list[str], names: list[str], threshold: float = 0.84):
    """Find each lexicon name that occurs in ref and the closest run of words in hyp.

    Returns (hyp with accepted name spellings replaced by the reference spelling, findings).
    A finding is {name, heard, match, similarity}:
      exact     the recogniser wrote the name as the story spells it
      close     another spelling or word split whose consonant skeleton is at least
                `threshold` similar ("Haider Ali", "my sore")
      mismatch  nothing close enough was heard
    """
    findings = []
    hyp = list(hyp)
    for name in sorted(names, key=lambda s: -len(s)):
        ntoks = normalise(name)
        n = len(ntoks)
        windows = []
        for i in range(len(ref) - n + 1):
            window = ref[i:i + n]
            if window[:-1] == ntoks[:-1] and window[-1] in (ntoks[-1], ntoks[-1] + "s"):
                windows.append(window)
        for window in windows:
            target = "".join(window)
            best = (0.0, 0, 0)
            for length in range(1, n + 3):
                for j in range(len(hyp) - length + 1):
                    cand_toks = hyp[j:j + length]
                    if cand_toks == window:
                        score = 2.0
                    elif cand_toks[0] in _FUNCTION_WORDS or cand_toks[-1] in _FUNCTION_WORDS:
                        continue
                    else:
                        score = difflib.SequenceMatcher(None, skeleton("".join(cand_toks)), skeleton(target)).ratio()
                        score -= 0.001 * abs(length - n)
                    if score > best[0]:
                        best = (score, j, length)
            score, j, length = best
            heard = " ".join(hyp[j:j + length]) if length else ""
            if score >= 2.0:
                findings.append({"name": name, "heard": heard, "match": "exact", "similarity": 1.0})
            elif score >= threshold:
                findings.append({"name": name, "heard": heard, "match": "close", "similarity": round(min(score, 1.0), 3)})
                hyp[j:j + length] = window
            else:
                findings.append({"name": name, "heard": heard, "match": "mismatch", "similarity": round(max(score, 0), 3)})
    return hyp, findings


def align(ref: list[str], hyp: list[str]) -> list[tuple[str, str | None, str | None]]:
    """Word-level edit alignment: list of (op, ref word, hyp word), op in ok/sub/del/ins."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]))
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            ops.append(("ok" if ref[i - 1] == hyp[j - 1] else "sub", ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            ops.append(("del", ref[i - 1], None))
            i -= 1
        else:
            ops.append(("ins", None, hyp[j - 1]))
            j -= 1
    return ops[::-1]


def compare(ref_text: str, hyp_text: str, names: list[str]) -> dict:
    ref = normalise(ref_text)
    hyp_raw = normalise(hyp_text)
    hyp, name_findings = match_names(ref, hyp_raw, names)
    ops = align(ref, hyp)
    errors = [op for op in ops if op[0] != "ok"]
    if errors and "".join(ref) == "".join(hyp):
        errors = []                                  # only word spacing differs: "darkwood" for "dark wood"
    number_errors = [op for op in errors if (op[1] and is_number_token(op[1])) or (op[2] and is_number_token(op[2]))]
    name_errors = [f for f in name_findings if f["match"] == "mismatch"]
    return {
        "ref": " ".join(ref),
        "hyp": " ".join(hyp_raw),
        "wer": round(len(errors) / max(1, len(ref)), 3),
        "errors": [{"op": o, "ref": r, "hyp": h} for o, r, h in errors],
        "names": name_findings,
        "name_errors": len(name_errors),
        "number_errors": [{"op": o, "ref": r, "hyp": h} for o, r, h in number_errors],
        "insertions": sum(1 for op in errors if op[0] == "ins"),
        "match": not errors and not name_errors,
    }


# ----------------------------------------------------------------------------- audio

def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def decode(path: Path, sr: int = SR):
    """Decode any audio file to mono float32 at `sr` with ffmpeg (honours the AAC edit list)."""
    import numpy as np
    p = run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"])
    return np.frombuffer(p.stdout, dtype=np.float32).astype(np.float64)


def db(x: float) -> float:
    import math
    return 20 * math.log10(max(x, 1e-12))


def frame_rms(x, sr: int, ms: float = 5.0):
    import numpy as np
    hop = max(1, int(sr * ms / 1000))
    n = len(x) // hop
    if n == 0:
        return np.zeros(0), hop
    return np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-20), hop


def speech_bounds(x, sr: int, rel_db: float = 40.0, floor_db: float = -60.0) -> tuple[int, int]:
    """First and last sample of speech: 5 ms frames louder than (peak frame - rel_db)."""
    import numpy as np
    rms, hop = frame_rms(x, sr)
    if len(rms) == 0:
        return 0, len(x)
    level = 20 * np.log10(rms + 1e-12)
    thr = max(level.max() - rel_db, floor_db)
    idx = np.where(level > thr)[0]
    if len(idx) == 0:
        return 0, len(x)
    return int(idx[0] * hop), int(min(len(x), (idx[-1] + 1) * hop))


def edge_silence_ms(x, sr: int, thr_db: float = -50.0) -> tuple[float, float]:
    """Milliseconds at head and tail before 2 ms frames rise above thr_db (absolute dBFS)."""
    import numpy as np
    rms, hop = frame_rms(x, sr, ms=2.0)
    level = 20 * np.log10(rms + 1e-12)
    idx = np.where(level > thr_db)[0]
    if len(idx) == 0:
        return len(x) / sr * 1000, len(x) / sr * 1000
    head = idx[0] * hop / sr * 1000
    tail = (len(x) - (idx[-1] + 1) * hop) / sr * 1000
    return round(float(head), 1), round(float(max(tail, 0)), 1)


def max_internal_gap_ms(x, sr: int, rel_db: float = 40.0) -> float:
    """Longest run of quiet 5 ms frames between the first and last speech frame."""
    import numpy as np
    rms, hop = frame_rms(x, sr)
    if len(rms) == 0:
        return 0.0
    level = 20 * np.log10(rms + 1e-12)
    loud = level > max(level.max() - rel_db, -60.0)
    idx = np.where(loud)[0]
    if len(idx) < 2:
        return 0.0
    gaps = np.diff(idx) - 1
    return round(float(gaps.max() * hop / sr * 1000), 1)


def _k_weight(x, sr: int):
    """ITU-R BS.1770 K-weighting (the two pyloudnorm filters)."""
    import pyloudnorm as pyln
    from scipy.signal import lfilter
    meter = pyln.Meter(sr)
    y = x
    for f in meter._filters.values():
        y = lfilter(f.b, f.a, y)
    return y


def loudness(x, sr: int) -> tuple[float, str]:
    """(loudness in LUFS, method).

    bs1770: gated integrated loudness, for clips with at least SHORT_CLIP_MS of speech.
    kw_rms: K-weighted mean square over the speech region only, in the same units, for
            shorter clips where 400 ms gating blocks are too few to trust.
    """
    import numpy as np
    import pyloudnorm as pyln
    s, e = speech_bounds(x, sr)
    speech_ms = (e - s) / sr * 1000
    if speech_ms >= SHORT_CLIP_MS:
        try:
            val = pyln.Meter(sr).integrated_loudness(x)
            if np.isfinite(val):
                return float(val), "bs1770"
        except ValueError:
            pass
    y = _k_weight(x, sr)[s:e]
    if len(y) == 0:
        return -70.0, "kw_rms"
    return float(-0.691 + 10 * np.log10(np.mean(y ** 2) + 1e-20)), "kw_rms"


def kw_rms_loudness(x, sr: int) -> float:
    import numpy as np
    s, e = speech_bounds(x, sr)
    y = _k_weight(x, sr)[s:e]
    return float(-0.691 + 10 * np.log10(np.mean(y ** 2) + 1e-20)) if len(y) else -70.0


def true_peak_db(x) -> float:
    """Peak of the 4x oversampled signal, in dBTP."""
    import numpy as np
    from scipy.signal import resample_poly
    if len(x) == 0:
        return -120.0
    return db(float(np.max(np.abs(resample_poly(x, 4, 1)))))


def sample_peak_db(x) -> float:
    import numpy as np
    return db(float(np.max(np.abs(x)))) if len(x) else -120.0


def wpm(words: int, duration_ms: float) -> float:
    return round(words * 60000.0 / max(duration_ms, 1.0), 1)


def pace_ok(words: int, pace: str, measured_wpm: float) -> bool | None:
    """None when the clip is exempt (1 to 3 words)."""
    if words <= EXEMPT_MAX_WORDS:
        return None
    target = PACE_WPM[pace]
    return abs(measured_wpm - target) / target <= PACE_TOLERANCE
