#!/usr/bin/env python
"""Check every narration clip of one voice without ears.

  python tools/play/voice/check.py --voice <name> [--site tipu-summer-palace-bengaluru]
        [--chapters prologue,ch1] [--no-reel]

For every clip in the voice's manifest:
  (a) speech-to-text round trip on CPU (faster-whisper small.en, and base.en as a second
      opinion when the first disagrees), compared with the line after normalising case,
      punctuation and numbers. Names, dates and numbers are reported on their own.
  (b) words per minute against the pace target.
  (c) loudness, true peak, clipping, head and tail silence.

Writes reports/<voice>.json and reports/<voice>.md (failures first). Exit code 1 if any clip
fails. This script measures. It cannot tell whether a voice sounds good.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import statistics
import sys
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = ""          # CPU only, always

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

PRIMARY, SECOND = "small.en", "base.en"
LOUDNESS_TOL = {"bs1770": 1.0, "kw_rms": 1.5}
EDGE_MIN_MS, EDGE_MAX_MS = 15.0, 90.0
REEL_GAP_TOL_MS = 60.0
LIMITER_FLAG_DB = 3.0          # speech at -18 LUFS often needs a dB or two of peak limiting; more is worth a listen


class Recogniser:
    def __init__(self):
        os.environ.update({k: v for k, v in C.cpu_only_env().items() if k.startswith(("HF_", "CUDA"))})
        from faster_whisper import WhisperModel
        self._cls = WhisperModel
        self._models = {}

    def model(self, name: str):
        if name not in self._models:
            self._models[name] = self._cls(name, device="cpu", compute_type="int8", cpu_threads=4)
        return self._models[name]

    def hear(self, name: str, audio16k) -> str:
        segments, _ = self.model(name).transcribe(
            audio16k, language="en", beam_size=5, temperature=0.0, condition_on_previous_text=False,
            vad_filter=False, without_timestamps=True)
        return " ".join(s.text.strip() for s in segments).strip()


def has_inner_break(text: str) -> bool:
    return any(ch in text.rstrip(" .?!") for ch in ",.;:?!")


def check_clip(entry: dict, path: Path, rec: Recogniser, names: list[str], cfg: dict) -> dict:
    import numpy as np
    row = {"id": entry["id"], "chapter": entry.get("chapter"), "text": entry["text"], "pace": entry["pace"],
           "words": entry["words"], "fails": [], "warns": [], "flags": []}
    if not path.exists():
        row["fails"].append("file missing")
        return row
    x = C.decode(path)
    row["duration_ms"] = round(len(x) / C.SR * 1000)
    if abs(row["duration_ms"] - entry["duration_ms"]) > 5:
        row["flags"].append(f"manifest duration {entry['duration_ms']} ms differs from file")
    if entry.get("stale"):
        row["fails"].append("line changed in story.json since this clip was rendered")

    # (a) round trip
    a16 = C.decode(path, 16000).astype(np.float32)
    heard = rec.hear(PRIMARY, a16)
    cmp1 = C.compare(entry["text"], heard, names)
    row["stt"] = {"model": PRIMARY, "heard": heard, **{k: cmp1[k] for k in ("wer", "errors", "names", "number_errors", "insertions", "match")}}
    if cmp1["match"]:
        row["stt_status"] = "pass"
    else:
        heard2 = rec.hear(SECOND, a16)
        cmp2 = C.compare(entry["text"], heard2, names)
        row["stt_second"] = {"model": SECOND, "heard": heard2, **{k: cmp2[k] for k in ("wer", "errors", "names", "number_errors", "insertions", "match")}}
        if cmp2["match"]:
            row["stt_status"] = "warn"
            row["warns"].append(f"{PRIMARY} heard \"{heard}\", {SECOND} heard the line correctly")
        else:
            row["stt_status"] = "fail"
            kinds = []
            if cmp1["name_errors"] and cmp2["name_errors"]:
                kinds.append("name")
            if cmp1["number_errors"] and cmp2["number_errors"]:
                kinds.append("date or number")
            kinds.append("words")
            row["fails"].append(f"round trip ({', '.join(kinds)}): {PRIMARY} heard \"{heard}\", {SECOND} heard \"{heard2}\"")
    close = [n for n in cmp1["names"] if n["match"] == "close"]
    if close:
        row["flags"].append("name heard with another spelling: " + "; ".join(f"{n['name']} as \"{n['heard']}\"" for n in close))
    if cmp1["insertions"] and row["stt_status"] != "fail":
        row["flags"].append(f"{cmp1['insertions']} extra word(s) heard by {PRIMARY}")

    # (b) pace
    row["wpm"] = C.wpm(entry["words"], row["duration_ms"])
    row["wpm_target"] = C.PACE_WPM[entry["pace"]]
    ok = C.pace_ok(entry["words"], entry["pace"], row["wpm"])
    row["pace_status"] = "exempt" if ok is None else ("pass" if ok else "fail")
    row["pace_dev_pct"] = None if ok is None else round((row["wpm"] / row["wpm_target"] - 1) * 100, 1)
    if ok is False:
        row["fails"].append(f"pace {row['wpm']} wpm, target {row['wpm_target']} ({row['pace_dev_pct']:+.1f}%)")
    if ok is None and (entry.get("atempo", 1.0) > 1.0 or entry.get("engine_speed", 1.0) > 1.0):
        row["fails"].append("short clip was sped up")

    # (c) level and edges
    lufs, method = C.loudness(x, C.SR)
    row.update(loudness_lufs=round(lufs, 2), loudness_method=method, true_peak_db=round(C.true_peak_db(x), 2),
               sample_peak_db=round(C.sample_peak_db(x), 2), clipped_samples=int((abs(x) >= 0.999).sum()))
    head, tail = C.edge_silence_ms(x, C.SR)
    row.update(head_silence_ms=head, tail_silence_ms=tail, max_inner_gap_ms=C.max_internal_gap_ms(x, C.SR))
    if abs(lufs - C.TARGET_LUFS) > LOUDNESS_TOL[method]:
        row["fails"].append(f"loudness {lufs:.1f} LUFS ({method}), target {C.TARGET_LUFS}")
    if row["true_peak_db"] > C.TRUE_PEAK_MAX_DB:
        row["fails"].append(f"true peak {row['true_peak_db']} dBTP, limit {C.TRUE_PEAK_MAX_DB}")
    if row["clipped_samples"]:
        row["fails"].append(f"{row['clipped_samples']} clipped samples")
    for side, val in (("head", head), ("tail", tail)):
        if not (EDGE_MIN_MS <= val <= EDGE_MAX_MS):
            row["fails"].append(f"{side} silence {val} ms, wanted about {C.EDGE_SILENCE_MS}")

    # artefact flags: things to listen for, not failures
    if entry.get("limiter_db", 0) > LIMITER_FLAG_DB:
        row["flags"].append(f"limiter reduced a peak by {entry['limiter_db']} dB")
    if entry.get("raw_peak_db", -99) >= -0.1:
        row["flags"].append("engine output touched full scale before cleaning")
    if abs(entry.get("atempo", 1.0) - 1.0) > 0.10:
        row["flags"].append(f"time-stretched by more than 10% (atempo {entry['atempo']})")
    sp = cfg.get("speed", {})
    if ok is not None and "engine_speed" in entry and (
            entry["engine_speed"] <= sp.get("min", 0) + 0.005 or entry["engine_speed"] >= sp.get("max", 9) - 0.005):
        row["flags"].append(f"engine speed at the voice's limit ({entry['engine_speed']})")
    gap_limit = 1000.0 if has_inner_break(entry["text"]) else 350.0
    if row["max_inner_gap_ms"] > gap_limit:
        row["flags"].append(f"silence of {row['max_inner_gap_ms']} ms inside the clip")
    row["engine_speed"] = entry.get("engine_speed")
    row["atempo"] = entry.get("atempo")
    row["status"] = "FAIL" if row["fails"] else ("WARN" if row["warns"] else "PASS")
    return row


def check_reel(site: str, voice: str, rec: Recogniser) -> dict | None:
    import numpy as np
    meta_path = C.HERE / "reports" / f"names_{voice}.json"
    reel = C.audio_dir(site, voice) / "_names_reel.m4a"
    if not meta_path.exists() or not reel.exists():
        return None
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    x = C.decode(reel)
    rows, gaps = [], []
    for i, n in enumerate(meta["names"]):
        s = max(0, int((n["start_ms"] - 150) * C.SR / 1000))
        e = min(len(x), int((n["end_ms"] + 150) * C.SR / 1000))
        seg = x[s:e]
        from scipy.signal import resample_poly
        a16 = resample_poly(seg, 160, 441).astype(np.float32)
        heard = {m: rec.hear(m, a16) for m in (PRIMARY, SECOND)}
        result = {m: C.compare(n["name"], h, [n["name"]])["names"] for m, h in heard.items()}
        grades = [(r[0]["match"] if r else "mismatch") for r in result.values()]
        best = "exact" if "exact" in grades else ("close" if "close" in grades else "mismatch")
        rows.append({"n": n["n"], "name": n["name"], "heard": heard, "match": best, "tts_text": n["tts_text"],
                     "phonemes": n.get("phonemes")})
        if i + 1 < len(meta["names"]):
            gaps.append(meta["names"][i + 1]["start_ms"] - n["end_ms"])
    # measure the real gaps in the file: quiet runs longer than 400 ms between names
    rms, hop = C.frame_rms(x, C.SR, 5.0)
    quiet = 20 * np.log10(rms + 1e-12) < -50
    runs, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            runs.append((i - start) * hop / C.SR * 1000)
            start = None
    inner = [r for r in runs[1:] if r > 400] if runs else []
    return {"file": meta["file"], "duration_ms": round(len(x) / C.SR * 1000), "names": rows,
            "gap_ms_planned": meta["gap_ms"], "gaps_measured_ms": [round(g) for g in inner],
            "gaps_ok": len(inner) == len(meta["names"]) - 1 and all(abs(g - meta["gap_ms"]) <= REEL_GAP_TOL_MS for g in inner)}


def summarise(rows: list[dict]) -> dict:
    present = [r for r in rows if "wpm" in r]
    paced = [r for r in present if r["pace_status"] != "exempt"]
    bs = [r["loudness_lufs"] for r in present if r["loudness_method"] == "bs1770"]
    allv = [r["loudness_lufs"] for r in present]
    names = [n for r in present for n in r["stt"]["names"]]
    return {
        "clips": len(rows),
        "status": {s: sum(1 for r in rows if r.get("status", "FAIL") == s) for s in ("PASS", "WARN", "FAIL")},
        "round_trip": {
            "pass_primary": sum(1 for r in present if r["stt_status"] == "pass"),
            "pass_second_opinion_only": sum(1 for r in present if r["stt_status"] == "warn"),
            "fail": sum(1 for r in present if r["stt_status"] == "fail"),
            "names_exact": sum(1 for n in names if n["match"] == "exact"),
            "names_close": sum(1 for n in names if n["match"] == "close"),
            "names_mismatch": sum(1 for n in names if n["match"] == "mismatch"),
            "number_errors_primary": sum(len(r["stt"]["number_errors"]) for r in present),
        },
        "pace": {
            "checked": len(paced),
            "within_tolerance": sum(1 for r in paced if r["pace_status"] == "pass"),
            "exempt_short_clips": len(present) - len(paced),
            "mean_abs_deviation_pct": round(statistics.mean(abs(r["pace_dev_pct"]) for r in paced), 2) if paced else None,
            "max_abs_deviation_pct": round(max(abs(r["pace_dev_pct"]) for r in paced), 1) if paced else None,
            "engine_speed_median": round(statistics.median(r["engine_speed"] for r in paced if r.get("engine_speed")), 3) if paced else None,
            "engine_speed_min": round(min(r["engine_speed"] for r in paced if r.get("engine_speed")), 3) if paced else None,
        },
        "loudness": {
            "target_lufs": C.TARGET_LUFS,
            "bs1770_clips": len(bs),
            "bs1770_min": round(min(bs), 2) if bs else None,
            "bs1770_max": round(max(bs), 2) if bs else None,
            "bs1770_spread_lu": round(max(bs) - min(bs), 2) if bs else None,
            "all_min": round(min(allv), 2) if allv else None,
            "all_max": round(max(allv), 2) if allv else None,
            "all_spread_lu": round(max(allv) - min(allv), 2) if allv else None,
        },
        "peaks": {
            "max_true_peak_db": max((r["true_peak_db"] for r in present), default=None),
            "clipped_clips": sum(1 for r in present if r["clipped_samples"]),
        },
        "edges": {
            "head_ms_min": min((r["head_silence_ms"] for r in present), default=None),
            "head_ms_max": max((r["head_silence_ms"] for r in present), default=None),
            "tail_ms_min": min((r["tail_silence_ms"] for r in present), default=None),
            "tail_ms_max": max((r["tail_silence_ms"] for r in present), default=None),
        },
        "artefact_flags": sum(len(r["flags"]) for r in rows),
        "clips_with_flags": sum(1 for r in rows if r["flags"]),
    }


def write_md(path: Path, voice: str, site: str, cfg: dict, summary: dict, rows: list[dict], reel: dict | None, scope: str):
    s = summary
    rt, pc, ld = s["round_trip"], s["pace"], s["loudness"]
    L = [
        f"# Narration check: `{voice}`",
        "",
        f"Site `{site}`, {scope}. Engine {cfg['engine']} voice `{cfg['engine_voice']}` ({cfg['language']}). Checked {datetime.date.today().isoformat()} on CPU.",
        "Generated by `python tools/play/voice/check.py`. These are measurements. Nobody has listened to these clips.",
        "",
        "## Summary",
        "",
        f"- Clips: {s['clips']}. PASS {s['status']['PASS']}, WARN {s['status']['WARN']}, FAIL {s['status']['FAIL']}.",
        f"- Round trip: {rt['pass_primary']} of {s['clips']} heard word for word by {PRIMARY}; {rt['pass_second_opinion_only']} more only by {SECOND}; {rt['fail']} by neither.",
        f"- Names in clips ({PRIMARY}): {rt['names_exact']} exact spelling, {rt['names_close']} other spelling with the same consonants, {rt['names_mismatch']} not recognised. Number or date errors: {rt['number_errors_primary']}.",
        f"- Pace: {pc['within_tolerance']} of {pc['checked']} checked clips within {int(C.PACE_TOLERANCE * 100)}% of target (mean deviation {pc['mean_abs_deviation_pct']}%, worst {pc['max_abs_deviation_pct']}%). {pc['exempt_short_clips']} clips of 1 to 3 words are exempt and were not sped up.",
        f"- Engine speed needed to reach those targets: median {pc['engine_speed_median']}, lowest {pc['engine_speed_min']} (1.0 is the engine's own rate).",
        f"- Loudness: gated BS.1770 on {ld['bs1770_clips']} clips, {ld['bs1770_min']} to {ld['bs1770_max']} LUFS (spread {ld['bs1770_spread_lu']} LU). All clips, short ones by K-weighted RMS: {ld['all_min']} to {ld['all_max']} (spread {ld['all_spread_lu']} LU). Target {C.TARGET_LUFS}.",
        f"- Peaks: highest true peak {s['peaks']['max_true_peak_db']} dBTP (limit {C.TRUE_PEAK_MAX_DB}). Clips with clipped samples: {s['peaks']['clipped_clips']}.",
        f"- Edges: head silence {s['edges']['head_ms_min']} to {s['edges']['head_ms_max']} ms, tail {s['edges']['tail_ms_min']} to {s['edges']['tail_ms_max']} ms (wanted about {C.EDGE_SILENCE_MS}).",
        f"- Things to listen for: {s['artefact_flags']} flags on {s['clips_with_flags']} clips.",
        "",
    ]
    fails = [r for r in rows if r.get("status", "FAIL") == "FAIL"]
    warns = [r for r in rows if r.get("status") == "WARN"]
    L += ["## Failures", ""]
    if fails:
        L += ["| Clip | Line | Why |", "|---|---|---|"]
        for r in fails:
            L.append(f"| `{r['id']}` | {r['text']} | {'<br>'.join(r['fails'] + r['warns'])} |")
    else:
        L.append("None.")
    L += ["", "## Warnings", ""]
    if warns:
        L += ["| Clip | Line | Why |", "|---|---|---|"]
        for r in warns:
            L.append(f"| `{r['id']}` | {r['text']} | {'<br>'.join(r['warns'])} |")
    else:
        L.append("None.")
    flagged = [r for r in rows if r["flags"]]
    L += ["", "## Listen for", ""]
    if flagged:
        L += ["| Clip | Line | Flag |", "|---|---|---|"]
        for r in flagged:
            L.append(f"| `{r['id']}` | {r['text']} | {'<br>'.join(r['flags'])} |")
    else:
        L.append("No flags.")
    L += ["", "## Every clip", "",
          "| Clip | Status | Round trip | Pace | wpm | Target | ms | Engine speed | Stretch | LUFS | Method | True peak | Head ms | Tail ms | Heard |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    order = {"FAIL": 0, "WARN": 1, "PASS": 2}
    for r in sorted(rows, key=lambda r: order.get(r.get("status", "FAIL"), 0)):
        if "wpm" not in r:
            L.append(f"| `{r['id']}` | FAIL | | | | | | | | | | | | | file missing |")
            continue
        L.append(f"| `{r['id']}` | {r['status']} | {r['stt_status']} | {r['pace_status']} | {r['wpm']} | {r['wpm_target']} | {r['duration_ms']} | "
                 f"{r.get('engine_speed')} | {r.get('atempo')} | {r['loudness_lufs']} | {r['loudness_method']} | {r['true_peak_db']} | "
                 f"{r['head_silence_ms']} | {r['tail_silence_ms']} | {r['stt']['heard']} |")
    if reel:
        L += ["", "## Names reel", "",
              f"`{reel['file']}`, {reel['duration_ms']} ms. Gaps between names measured in the file: "
              f"{', '.join(str(g) for g in reel['gaps_measured_ms'])} ms (planned {reel['gap_ms_planned']}). "
              f"{'All gaps within tolerance.' if reel['gaps_ok'] else 'GAPS NOT AS PLANNED.'}",
              "",
              "A recogniser hearing one unfamiliar name with no sentence around it often spells it another way, so this table is weak evidence either way. It is here to show the owner which names to listen to first.",
              "",
              f"| # | Name | {PRIMARY} heard | {SECOND} heard | Match | Phonemes the engine used |",
              "|---|---|---|---|---|---|"]
        for n in reel["names"]:
            L.append(f"| {n['n']} | {n['name']} | {n['heard'][PRIMARY]} | {n['heard'][SECOND]} | {n['match']} | `{n.get('phonemes') or ''}` |")
    path.write_text("\n".join(L) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--site", default=C.DEFAULT_SITE)
    ap.add_argument("--chapters", help="comma separated chapter ids, default every clip in the manifest")
    ap.add_argument("--no-reel", action="store_true")
    args = ap.parse_args()
    C.ensure_venv()

    voices = C.load_voices()["voices"]
    if args.voice not in voices:
        ap.error(f"Unknown voice {args.voice!r}")
    cfg = voices[args.voice]
    out_dir = C.audio_dir(args.site, args.voice)
    manifest_path = out_dir / "manifest.json"
    if not manifest_path.exists():
        sys.exit(f"No manifest at {manifest_path}. Render the voice first.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    story_segs = C.expand_story(C.load_story(args.site))
    chapters = [c.strip() for c in args.chapters.split(",")] if args.chapters else None
    by_id = {c["id"]: c for c in manifest["clips"]}
    names = C.lexicon_names(C.load_lexicon())
    rec = Recogniser()

    rows = []
    wanted = [s for s in story_segs if not chapters or s["chapter"] in chapters]
    if not chapters:
        wanted = [s for s in wanted if s["id"] in by_id]      # only what this voice has rendered
    for i, seg in enumerate(wanted, 1):
        entry = by_id.get(seg["id"])
        if entry is None:
            rows.append({"id": seg["id"], "chapter": seg["chapter"], "text": seg["text"], "pace": seg["pace"],
                         "words": seg["words"], "fails": ["not rendered in this voice"], "warns": [], "flags": [], "status": "FAIL"})
            continue
        if entry["text"] != seg["text"] or entry["pace"] != seg["pace"]:
            entry = {**entry, "stale": True}
        row = check_clip(entry, out_dir / entry["file"], rec, names, cfg)
        row.setdefault("status", "FAIL")
        rows.append(row)
        print(f"[{i:2d}/{len(wanted)}] {row['id']:12s} {row['status']:4s} {'; '.join(row['fails'] + row['warns'])}")

    reel = None if args.no_reel else check_reel(args.site, args.voice, rec)
    summary = summarise(rows)
    scope = f"chapters {', '.join(chapters)}" if chapters else f"all {len(rows)} rendered clips ({', '.join(sorted({r['chapter'] for r in rows}, key=[s['chapter'] for s in story_segs].index))})"
    reports = C.HERE / "reports"
    reports.mkdir(exist_ok=True)
    payload = {"voice": args.voice, "site": args.site, "scope": scope, "checked": datetime.date.today().isoformat(),
               "stt_models": [PRIMARY, SECOND], "device": "cpu", "summary": summary, "clips": rows, "names_reel": reel}
    (reports / f"{args.voice}.json").write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_md(reports / f"{args.voice}.md", args.voice, args.site, cfg, summary, rows, reel, scope)
    print(f"\n{args.voice}: PASS {summary['status']['PASS']}  WARN {summary['status']['WARN']}  FAIL {summary['status']['FAIL']}"
          f"  | round trip {summary['round_trip']['pass_primary']}/{summary['clips']}"
          f"  | pace {summary['pace']['within_tolerance']}/{summary['pace']['checked']}"
          f"  | loudness spread {summary['loudness']['all_spread_lu']} LU")
    print(f"Report: {reports / (args.voice + '.md')}")
    return 1 if summary["status"]["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
