#!/usr/bin/env python
"""Find how far a voice can be slowed before the speech-to-text round trip gets worse.

  python tools/play/voice/calibrate.py --voice <name> [--speeds 0.5,0.6,0.7,0.8,0.9,1.0]

The pace targets in PLAY_BRIEF 8.11 (150 / 125 / 170 words a minute, measured per clip) are
well below the rate these engines read short lines at. Slowing an engine is not free: below
some speed the first sound of a clip degrades and both recognisers start to hear an extra
word. This script reads a fixed set of story lines at several engine speeds, cleans each the
way render.py does, and reports how many are heard word for word at each speed.

The result is written to reports/speed_probe_<voice>.json and printed. Use it to set, under
"speed" for the voice in voices.json, "min_short" (clips of 1 to 3 words) and "min" (longer
lines): the lowest speeds that are no worse than the engine's own rate (1.0). Nothing is
written to the audio pack.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = ""

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

LONG_PROBES = 6


def floor(table: list[dict], key: str) -> float:
    """Lowest speed, in an unbroken run down from the fastest, at which no more than one
    probe line fewer is heard by both recognisers than at the fastest speed."""
    ordered = sorted(table, key=lambda t: -t["speed"])
    base = ordered[0][key]
    lowest = ordered[0]["speed"]
    for t in ordered:
        if t[key] >= base - 1:
            lowest = t["speed"]
        else:
            break
    return lowest


def analyse(voice: str, speeds: list[float], rows: list[dict]) -> dict:
    import numpy as np
    import check as K
    names = C.lexicon_names(C.load_lexicon())
    for r in rows:                                   # recompute, so a saved probe can be re-read
        r["ok"] = {m: C.compare(r["text"], h, names)["match"] for m, h in r["heard"].items()}
    table = []
    for sp in speeds:
        at = [r for r in rows if r["speed"] == sp]
        sh = [r for r in at if r["words"] <= C.EXEMPT_MAX_WORDS]
        lg = [r for r in at if r["words"] > C.EXEMPT_MAX_WORDS]
        table.append({
            "speed": sp,
            "short_both": sum(1 for r in sh if all(r["ok"].values())), "short_total": len(sh),
            "long_both": sum(1 for r in lg if all(r["ok"].values())), "long_total": len(lg),
            "all_primary": sum(1 for r in at if r["ok"][K.PRIMARY]), "all_total": len(at),
            "long_wpm_median": round(float(np.median([r["wpm"] for r in lg])), 1) if lg else None,
        })
    return {"voice": voice, "checked": datetime.date.today().isoformat(), "stt_models": [K.PRIMARY, K.SECOND],
            "rule": " ".join(floor.__doc__.split()),
            "suggested_min_short": floor(table, "short_both"), "suggested_min": floor(table, "long_both"),
            "by_speed": table, "probes": rows}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--site", default=C.DEFAULT_SITE)
    ap.add_argument("--speeds", default="0.5,0.6,0.7,0.8,0.9,1.0")
    ap.add_argument("--reanalyse", action="store_true", help="recompute the table from the saved probe, no synthesis")
    args = ap.parse_args()
    C.ensure_venv()

    saved = C.HERE / "reports" / f"speed_probe_{args.voice}.json"
    if args.reanalyse:
        old = json.loads(saved.read_text(encoding="utf-8"))
        out = analyse(args.voice, sorted({r["speed"] for r in old["probes"]}), old["probes"])
        out["checked"] = old.get("checked", out["checked"])
        saved.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        report(out)
        return 0

    import numpy as np
    from scipy.signal import resample_poly
    import check as K
    import render as R

    voices = C.load_voices()["voices"]
    cfg = voices[args.voice]
    lexicon = C.load_lexicon()
    names = C.lexicon_names(lexicon)
    speeds = [float(s) for s in args.speeds.split(",")]
    segs = C.expand_story(C.load_story(args.site))
    short = [s for s in segs if s["words"] <= C.EXEMPT_MAX_WORDS]
    longer = [s for s in segs if s["words"] >= 7]
    step = max(1, len(longer) // LONG_PROBES)
    probes = short + longer[::step][:LONG_PROBES]

    rec = K.Recogniser()
    worker = R.Worker(args.voice, cfg)
    tmp = C.SCRATCH / "tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    rows = []
    try:
        for seg in probes:
            tts_text, extras = C.apply_lexicon(seg["text"], lexicon, cfg["engine"], cfg.get("variant"))
            for sp in speeds:
                out = tmp / f"probe-{args.voice}.wav"
                worker.synth(text=tts_text, speed=sp, out=str(out), seed=1, **extras)
                x, _ = R.load_raw(out)
                y, _ = R.normalise(R.pad(R.fade(R.cut_speech(x))))
                a16 = resample_poly(y, 160, 441).astype(np.float32)
                heard = {m: rec.hear(m, a16) for m in (K.PRIMARY, K.SECOND)}
                ok = {m: C.compare(seg["text"], h, names)["match"] for m, h in heard.items()}
                rows.append({"id": seg["id"], "text": seg["text"], "words": seg["words"], "speed": sp,
                             "ms": round(len(y) / C.SR * 1000), "wpm": C.wpm(seg["words"], len(y) / C.SR * 1000),
                             "heard": heard, "ok": ok})
                print(f"{seg['id']:10s} {sp:.2f} {rows[-1]['wpm']:6.1f} wpm  "
                      f"{'ok ' if ok[K.PRIMARY] else 'NO '}{'ok ' if ok[K.SECOND] else 'NO '} {heard[K.PRIMARY]!r} / {heard[K.SECOND]!r}", flush=True)
    finally:
        worker.close()

    out = analyse(args.voice, speeds, rows)
    reports = C.HERE / "reports"
    reports.mkdir(exist_ok=True)
    saved.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report(out)
    return 0


def report(out: dict) -> None:
    print("\nspeed  short lines heard by both   longer lines heard by both   median wpm of longer lines")
    for t in out["by_speed"]:
        print(f"{t['speed']:.2f}   {t['short_both']:2d} of {t['short_total']:2d}                   {t['long_both']:2d} of {t['long_total']:2d}                    {t['long_wpm_median']}")
    print(f"\nSuggested for {out['voice']} in voices.json: speed.min_short {out['suggested_min_short']} (clips of 1 to 3 words), "
          f"speed.min {out['suggested_min']} (longer lines)")


if __name__ == "__main__":
    sys.exit(main())
