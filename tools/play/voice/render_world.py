#!/usr/bin/env python
"""Render the open world's role-figure dialogue: one clip per line, one Kokoro voice per role.

  tools/play/voice/.venv/Scripts/python tools/play/voice/render_world.py [--site <slug>] [--version 1] [--only id,id]

Reads content/play/<site>/missions.json (never writes it). Narrator lines are story beats and
already have clips, so only role-figure lines are rendered. Each clip gets the same cleaning as
the narration, a words-per-minute check and a speech-to-text round trip. CPU only.

Writes public/play/worlds/<site>/v<N>/audio/<voice>/<line-id>.m4a and a report beside this file.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
import render as R  # noqa: E402

# Voice id in missions.json -> Kokoro voice. All from hexgrad/Kokoro-82M (Apache-2.0).
ROLE_VOICES = {
    "kokoro-hm-omega": "hm_omega",
    "kokoro-hm-psi": "hm_psi",
    "kokoro-hf-alpha": "hf_alpha",
    "kokoro-hf-beta": "hf_beta",
    # Blends of voice packs already on disk (Kokoro averages a comma-separated list).
    "kokoro-mix-trader": "hm_omega,hm_psi",
    "kokoro-mix-sepoy": "hm_psi,hm_psi,hm_omega",
    "kokoro-mix-bearer": "hm_omega,hm_omega,hm_psi",
    "kokoro-mix-clerk": "hm_psi,hm_psi,hm_psi,bf_emma",
}
PACE_WPM = {"steady": 150, "slow": 125, "brisk": 170}


def worker_cfg(engine_voice: str) -> dict:
    # English phonemes through a Hindi speaker's voice: Indian English, not read as Hindi.
    return {"venv": ".venv", "worker": "engines/kokoro_worker.py", "args": ["--voice", engine_voice, "--lang", "a"]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site", default="tipu-summer-palace-bengaluru")
    ap.add_argument("--version", default="1")
    ap.add_argument("--only")
    ap.add_argument("--missions", help="Read this file instead of content/play/<site>/missions.json")
    ap.add_argument("--audio-out", help="Write clips under this folder instead of the world version's audio folder")
    ap.add_argument("--report", help="Write the report here instead of reports/world_dialogue.json")
    ap.add_argument("--new-only", action="store_true", help="Never overwrite a clip that already exists")
    a = ap.parse_args()
    root = Path(__file__).resolve().parents[3]
    source = Path(a.missions) if a.missions else root / "content" / "play" / a.site / "missions.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    lexicon = C.load_lexicon()
    only = set(a.only.split(",")) if a.only else None
    by_voice: dict[str, list[dict]] = {}
    for lines in data["dialogue"].values():
        for l in lines:
            if l.get("beat") or (only and l["id"] not in only):
                continue
            by_voice.setdefault(data["voices"][l["speaker"]], []).append(l)

    from faster_whisper import WhisperModel
    stt = WhisperModel("small.en", device="cpu", compute_type="int8")
    tmp = C.SCRATCH / "world"
    tmp.mkdir(parents=True, exist_ok=True)
    out_root = Path(a.audio_out) if a.audio_out else root / "public" / "play" / "worlds" / a.site / f"v{a.version}" / "audio"
    report = []
    for voice, lines in by_voice.items():
        if a.new_only:
            lines = [l for l in lines if not (out_root / voice / f"{l['id']}.m4a").exists()]
            if not lines:
                continue
        engine_voice = ROLE_VOICES[voice]
        worker = R.Worker(voice, worker_cfg(engine_voice))
        for l in lines:
            text = l.get("say") or l["text"]
            tts, _ = C.apply_lexicon(text, lexicon, "kokoro", "a")
            words = C.word_count(text)
            target = PACE_WPM[l.get("pace", "steady")]
            speed, best = 0.9, None
            for _ in range(3):
                raw = tmp / f"{l['id']}.wav"
                worker.synth(text=tts, speed=speed, out=str(raw), seed=1)
                x, _peak = R.load_raw(raw)
                x = R.cut_speech(x)
                ms = len(x) / C.SR * 1000
                wpm = C.wpm(words, ms)
                best = (x, wpm, speed)
                if abs(wpm - target) / target <= 0.12 or words <= 3:
                    break
                speed = max(0.7, min(1.2, speed * target / wpm))
            x, wpm, speed = best
            y, _info = R.normalise(R.fade(R.pad(x)))
            dest = out_root / voice / f"{l['id']}.m4a"
            R.encode(y, dest, tmp / l["id"])
            segs, _ = stt.transcribe(str(dest), language="en", beam_size=5, condition_on_previous_text=False)
            heard = " ".join(s.text.strip() for s in segs)
            cmp = C.compare(text, heard, C.lexicon_names(lexicon))
            ok = bool(cmp["match"])
            report.append({"id": l["id"], "voice": voice, "text": text, "heard": heard, "match": ok,
                           "wpm": round(wpm), "target_wpm": target, "speed": round(speed, 3)})
            print(f"{l['id']:10} {voice:16} {round(wpm):4} wpm  {'ok ' if ok else 'DIFF'}  {heard}", flush=True)
        worker.close()
    rep = Path(a.report) if a.report else Path(__file__).resolve().parent / "reports" / "world_dialogue.json"
    rep.write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    good = sum(1 for r in report if r["match"])
    print(f"{good} of {len(report)} heard word for word")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
