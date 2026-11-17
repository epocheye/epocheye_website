#!/usr/bin/env python
"""Check an assembled or published pack against its own site.json, and build contact sheets.

  python tools/play/verify_pack.py <slug> [--published] [--sheets] [--nodes a,b]

Checks: every file site.json implies exists (cube faces at every size for every state, masks, tier,
pieces, evidence images); links name real viewpoints and run both ways; each restoration's "nodes"
list equals the viewpoints that carry its mask; the story's viewpoint, restoration and image
references resolve. With --sheets it writes one contact sheet per viewpoint (THEN, NOW, every mask,
tier) from the raw renders into tools/play/out/<slug>/v<N>/sheets/.
Exit code 1 if anything is missing.
"""
import argparse, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "play"
sys.path.insert(0, str(TOOLS))
import sheet as S  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--published", action="store_true")
    ap.add_argument("--sheets", action="store_true")
    ap.add_argument("--nodes", default="")
    ap.add_argument("--thumb", type=int, default=384)
    a = ap.parse_args()
    cfg = json.loads((TOOLS / "sites" / f"{a.slug}.json").read_text(encoding="utf-8"))
    wd = TOOLS / "out" / a.slug / f"v{cfg['version']}"
    pack = (ROOT / "public" / "play" / "packs" / a.slug / f"v{cfg['version']}") if a.published else wd / "pack"
    site = json.loads((pack / "site.json").read_text(encoding="utf-8"))
    bad, ok = [], 0

    def need(rel):
        nonlocal ok
        if (pack / rel).is_file() and (pack / rel).stat().st_size > 0:
            ok += 1
        else:
            bad.append(f"missing file: {rel}")

    ids = [n["id"] for n in site["nodes"]]
    faces, sizes = site["site"]["faces"], site["site"]["sizes"]
    for n in site["nodes"]:
        for st in ("then", "now"):
            if st not in n["states"]:
                bad.append(f"{n['id']}: no {st} state")
        for st in n["states"]:
            for s in sizes:
                for f in faces:
                    need(f"pano/{n['id']}/{st}/{s}/{f}.webp")
        for m in n["masks"]:
            need(f"mask/{n['id']}/{m}.webp")
        if n["tier"]:
            need(f"tier/{n['id']}.webp")
        else:
            bad.append(f"{n['id']}: no tier mask")
        for l in n.get("links", []):
            if l not in ids:
                bad.append(f"{n['id']}: link to unknown viewpoint {l}")
            elif n["id"] not in next(x for x in site["nodes"] if x["id"] == l).get("links", []):
                bad.append(f"{n['id']} -> {l}: link is one way")
    if site["site"].get("start_node") not in ids:
        bad.append("start_node is not a viewpoint")
    for r in site["restorations"]:
        seen = [n["id"] for n in site["nodes"] if r["id"] in n["masks"]]
        if sorted(seen) != sorted(r["nodes"]):
            bad.append(f"restoration {r['id']}: nodes {r['nodes']} but masks exist for {seen}")
        if r.get("piece"):
            need(r["piece"])
    for e in site.get("evidence_images", []):
        need(e["file"])
    story = site.get("story") or {}
    rids = {r["id"] for r in site["restorations"]}
    for ch in story.get("chapters", []):
        for nid in ch.get("nodes", []):
            if nid not in ids:
                bad.append(f"story chapter {ch['id']}: unknown viewpoint {nid}")
        for b in ch.get("beats", []):
            if b.get("restoration") and b["restoration"] not in rids:
                bad.append(f"story beat {b.get('id')}: unknown restoration {b['restoration']}")
            if (b.get("at") or {}).get("node") and b["at"]["node"] not in ids:
                bad.append(f"story beat {b.get('id')}: unknown viewpoint {b['at']['node']}")
            r = b.get("restoration")
            if r in rids and not any(nid in next(x for x in site["restorations"] if x["id"] == r)["nodes"] for nid in ch.get("nodes", [])):
                bad.append(f"story beat {b.get('id')}: restoration {r} is not visible from any viewpoint of chapter {ch['id']}")
    for e in story.get("evidence", []):
        if e.get("image") and not (pack / e["image"]).is_file():
            bad.append(f"story evidence {e['id']}: image {e['image']} is not in the pack (the engine hides it)")

    sizes_by = {}
    for f in pack.rglob("*"):
        if f.is_file():
            top = f.relative_to(pack).parts[0]
            sizes_by[top] = sizes_by.get(top, 0) + f.stat().st_size
    print(f"pack: {pack}")
    print(f"viewpoints: {len(ids)}: {', '.join(ids)}")
    for n in site["nodes"]:
        print(f"  {n['id']:17s} states {n['states']} masks {n['masks']} tier {n['tier']} links {n.get('links')}")
    for r in site["restorations"]:
        print(f"  restoration {r['id']:16s} chapter {r['chapter']} nodes {r['nodes']} piece {r.get('piece')}")
    print("size by folder: " + ", ".join(f"{k} {v / 1e6:.1f} MB" for k, v in sorted(sizes_by.items(), key=lambda kv: -kv[1])))
    print(f"total {sum(sizes_by.values()) / 1e6:.1f} MB; {ok} implied files present, {len(bad)} problem(s)")
    for b in bad:
        print("  PROBLEM:", b)

    if a.sheets:
        raws = sorted((d for d in wd.glob("raw*") if d.is_dir()), key=lambda d: int(d.name[3:] or 0), reverse=True)
        want = [x for x in a.nodes.split(",") if x]
        for n in site["nodes"]:
            if want and n["id"] not in want:
                continue
            nd = next((d / n["id"] for d in raws if (d / n["id"]).exists()), None)
            if not nd:
                continue
            rows = [(f"{n['id']} THEN", str(nd), "then"), (f"{n['id']} NOW", str(nd), "now")]
            rows += [(f"{n['id']} mask {r['id']}" + ("" if r["id"] in n["masks"] else " (empty, dropped)"), str(nd), f"mask_{r['id']}")
                     for r in cfg["restorations"] if (nd / f"mask_{r['id']}_px.png").exists()]
            rows.append((f"{n['id']} tier (white = our reconstruction)", str(nd), "tier"))
            print("sheet:", S.build(rows, wd / "sheets" / f"{n['id']}.jpg", a.thumb))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
