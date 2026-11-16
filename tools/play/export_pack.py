#!/usr/bin/env python
"""Epocheye Play: site pack exporter.

Turns a site's Blender project plus one hand-written story.json into a pack the
engine can load. Runs Blender only in the background (blender -b), never the open
window or its connector, and never saves the site's .blend.

  python tools/play/export_pack.py <slug> estimate          # render hours, no final rendering
  python tools/play/export_pack.py <slug> render [--nodes a,b] [--what then,now,masks,tier] --yes
  python tools/play/export_pack.py <slug> assemble          # faces to webp sizes, site.json, credits
  python tools/play/export_pack.py <slug> publish           # copy to public/play/packs/<slug>/v<N>/

Writes only inside tools/play/out/ until "publish".
"""
import argparse, json, os, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "play"
OUT = TOOLS / "out"
BLENDER_CANDIDATES = [
    os.environ.get("BLENDER_EXE", ""),
    r"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe",
    r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
]
GPU_LOCKS = [r"E:\konark\locks\gpu.lock"]
FACES = ["px", "nx", "py", "ny", "pz", "nz"]
# forward / up of each face in the site's world axes (Z up), as rendered by render_node.py
FACE_AXES = {
    "px": {"f": [1, 0, 0], "u": [0, 0, 1]}, "nx": {"f": [-1, 0, 0], "u": [0, 0, 1]},
    "pz": {"f": [0, 1, 0], "u": [0, 0, 1]}, "nz": {"f": [0, -1, 0], "u": [0, 0, 1]},
    "py": {"f": [0, 0, 1], "u": [0, -1, 0]}, "ny": {"f": [0, 0, -1], "u": [0, 1, 0]},
}


def blender_exe():
    for c in BLENDER_CANDIDATES:
        if c and os.path.exists(c):
            return c
    sys.exit("Blender not found. Set BLENDER_EXE.")


def load_site(slug):
    p = TOOLS / "sites" / f"{slug}.json"
    site = json.loads(p.read_text(encoding="utf-8"))
    site["_path"] = str(p)
    return site


def gpu_busy():
    """Return a reason string if the GPU must not be used now, else None."""
    for lock in GPU_LOCKS:
        if os.path.exists(lock):
            return f"lock file present: {lock}"
    try:
        samples = []
        for _ in range(3):
            q = subprocess.run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total",
                                "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=20)
            samples.append([float(x) for x in q.stdout.strip().splitlines()[0].split(",")])
            time.sleep(1)
        util = max(s[0] for s in samples)
        used, total = samples[-1][1], samples[-1][2]
        if util > 25:
            return f"GPU is in use by another job ({util:.0f}% utilisation)"
        if used > 0.5 * total:
            return f"GPU memory is held by another job ({used:.0f} of {total:.0f} MiB)"
    except Exception as e:
        return f"nvidia-smi unavailable ({e})"
    return None


def run_blender(site, script, args, log):
    cmd = [blender_exe(), "-b", site["blend"], "--python", str(TOOLS / "blender" / script), "--"] + args
    t0 = time.time()
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
    with open(log, "a", encoding="utf-8") as lf:
        lf.write("\n$ " + " ".join(cmd) + "\n" + p.stdout)
    reports = [json.loads(line.split(" ", 1)[1]) for line in p.stdout.splitlines() if line.startswith("@@")]
    return reports, time.time() - t0, p.returncode


def work_dir(site):
    d = OUT / site["slug"] / f"v{site['version']}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def pick_nodes(site, a):
    want = [x for x in a.nodes.split(",") if x]
    return [n for n in site["nodes"] if not want or n["id"] in want]


def cmd_estimate(site, a):
    """Time a small probe per kind of node, scale by pixels and samples, report hours."""
    busy = gpu_busy()
    if busy:
        sys.exit(f"Not probing: {busy}")
    wd = work_dir(site)
    probe_px = 256
    face_px = a.face or site.get("face_px", 2048)
    nodes = pick_nodes(site, a)
    kinds = {}
    for n in nodes:
        kinds.setdefault(n.get("kind", "exterior"), n)
    rate = {}
    for kind, n in kinds.items():
        samples = n.get("samples", site.get("samples", 128))
        rep, wall, rc = run_blender(site, "render_node.py",
                                    ["--site", site["_path"], "--node", n["id"], "--out", str(wd / "_probe"),
                                     "--what", "then", "--face", str(probe_px), "--samples", str(samples), "--force"],
                                    wd / "export.log")
        secs = next((r["seconds"].get("then") for r in rep if "seconds" in r), None)
        if not secs:
            sys.exit(f"probe failed for {n['id']} (see {wd / 'export.log'})")
        rate[kind] = {"probe_seconds": secs, "load_seconds": wall - secs, "samples": samples}
        print(f"probe {kind:9s} node {n['id']}: {secs:.0f} s for 6 faces at {probe_px}px, {samples} spp, load {wall - secs:.0f} s")
    scale = (face_px / probe_px) ** 2
    total = 0
    for n in nodes:
        r = rate[n.get("kind", "exterior")]
        spp = n.get("samples", site.get("samples", 128)) / r["samples"]
        beauty = r["probe_seconds"] * scale * spp
        masks = 6 * 4 * (1 + sum(1 for x in site["restorations"] if n["id"] in x["nodes"]))
        node_total = 2 * beauty + masks + 2 * r["load_seconds"]
        total += node_total
        print(f"  {n['id']:16s} then+now {2 * beauty / 60:6.1f} min, masks {masks / 60:4.1f} min")
    print(f"ESTIMATE: {total / 3600:.1f} hours of GPU for {len(nodes)} nodes at {face_px}px faces "
          f"(scaled from {probe_px}px probes, so treat it as plus or minus a third).")
    (wd / "estimate.json").write_text(json.dumps({"hours": total / 3600, "rate": rate, "nodes": len(nodes),
                                                  "face_px": face_px}, indent=1))


def cmd_render(site, a):
    if not a.yes:
        sys.exit("Refusing to render without --yes. Run estimate first and read the hours.")
    wd = work_dir(site)
    raw = wd / f"raw{a.face or site.get('face_px', 2048)}"   # one folder per face size, so sizes never mix
    what = a.what.split(",")
    for n in pick_nodes(site, a):
        for group in (["then", "masks", "tier"], ["now"]):
            g = [w for w in group if w in what]
            if not g:
                continue
            busy = gpu_busy()
            if busy:
                sys.exit(f"Stopping before node {n['id']}: {busy}. Finished faces are kept; run again to resume.")
            args = ["--site", site["_path"], "--node", n["id"], "--out", str(raw), "--what", ",".join(g)]
            if a.face:
                args += ["--face", str(a.face)]
            if a.force:
                args += ["--force"]
            rep, wall, rc = run_blender(site, "render_node.py", args, wd / "export.log")
            print(f"{n['id']:16s} {','.join(g):16s} {wall / 60:5.1f} min", [r.get("seconds") for r in rep if "seconds" in r], flush=True)


def cmd_assemble(site, a):
    from PIL import Image, ImageChops
    wd = work_dir(site)
    raws = sorted((d for d in wd.glob("raw*") if d.is_dir()), key=lambda d: int(d.name[3:] or 0), reverse=True)
    pack = wd / "pack"
    sizes = site.get("sizes", [512, 1024, 2048])
    quality = site.get("webp_quality", 90)
    mask_px = site.get("mask_px", 1024)
    node_out = []
    top = 0
    for n in site["nodes"]:
        # largest face size that has this node complete in both states, else the largest with anything
        done = [d / n["id"] for d in raws if all((d / n["id"] / f"{st}_{f}.png").exists() for st in ("then", "now") for f in FACES)]
        some = [d / n["id"] for d in raws if (d / n["id"]).exists()]
        if not (done or some):
            print("skip (not rendered):", n["id"])
            continue
        nd = (done or some)[0]
        have = []
        for state in ("then", "now"):
            if not all((nd / f"{state}_{f}.png").exists() for f in FACES):
                continue
            have.append(state)
            for f in FACES:
                im = Image.open(nd / f"{state}_{f}.png").convert("RGB")
                top = max(top, im.width)
                for s in sizes:
                    if s > im.width:
                        continue
                    dst = pack / "pano" / n["id"] / state / str(s)
                    dst.mkdir(parents=True, exist_ok=True)
                    (im if s == im.width else im.resize((s, s), Image.LANCZOS)).save(dst / f"{f}.webp", quality=quality, method=6)

        def strip(prefix, dst):
            if not all((nd / f"{prefix}_{f}.png").exists() for f in FACES):
                return False
            sheet = Image.new("L", (mask_px * 6, mask_px))
            for i, f in enumerate(FACES):
                face = Image.open(nd / f"{prefix}_{f}.png").convert("L").resize((mask_px, mask_px), Image.LANCZOS)
                extra = nd / f"{prefix}_col_{f}.png"
                if extra.exists():   # collection pass (linked libraries): alpha is the coverage
                    alpha = Image.open(extra).convert("RGBA").getchannel("A").resize((mask_px, mask_px), Image.LANCZOS)
                    face = ImageChops.lighter(face, alpha)
                sheet.paste(face, (i * mask_px, 0))
            if sheet.getextrema()[1] <= 8:
                return False      # not visible from this node
            dst.parent.mkdir(parents=True, exist_ok=True)
            sheet.save(dst, quality=92, method=6)
            return True

        masks = [r["id"] for r in site["restorations"]
                 if n["id"] in r["nodes"] and strip("mask_" + r["id"], pack / "mask" / n["id"] / f"{r['id']}.webp")]
        has_tier = strip("tier", pack / "tier" / f"{n['id']}.webp")
        node_out.append({**{k: v for k, v in n.items() if k not in ("samples", "exposure")},
                         "states": have, "masks": masks, "tier": has_tier})
    story_path = ROOT / "content" / "play" / site["slug"] / "story.json"
    story = None
    if story_path.exists():
        v = subprocess.run(["node", str(ROOT / "scripts" / "play" / "validate-story.mjs"), str(story_path)],
                           capture_output=True, text=True)
        print((v.stdout + v.stderr).strip())
        if v.returncode != 0:
            sys.exit("story.json failed validation; pack not assembled.")
        story = json.loads(story_path.read_text(encoding="utf-8"))
    site_json = {
        "format": 1, "mode": "pano",
        "site": {"slug": site["slug"], "name": site["name"], "place": site.get("place"), "version": site["version"],
                 "axes": "z-up", "faces": FACES, "face_axes": FACE_AXES,
                 "sizes": [s for s in sizes if s <= top], "mask_layout": "strip6",
                 "start_node": site.get("start_node")},
        "nodes": node_out,
        "restorations": [{k: v for k, v in r.items() if k != "select"} for r in site["restorations"]],
        "figures": site.get("figures", []),
        "story": story, "daily": [], "credits": site.get("credits", []),
    }
    pack.mkdir(parents=True, exist_ok=True)
    (pack / "site.json").write_text(json.dumps(site_json, ensure_ascii=False, indent=1), encoding="utf-8")
    (pack / "LICENSES.json").write_text(json.dumps(site.get("licenses", []), indent=1), encoding="utf-8")
    (pack / "CREDITS.md").write_text("# Credits\n\n" + "\n".join(f"- {c}" for c in site.get("credits", [])) + "\n", encoding="utf-8")
    size = sum(f.stat().st_size for f in pack.rglob("*") if f.is_file())
    print(f"assembled {pack} ({size / 1e6:.1f} MB, {len(node_out)} nodes)")


def cmd_publish(site, a):
    src = work_dir(site) / "pack"
    dst = ROOT / "public" / "play" / "packs" / site["slug"] / f"v{site['version']}"
    if not (src / "site.json").exists():
        sys.exit("Nothing assembled yet.")
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print("published", dst)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("cmd", choices=["estimate", "render", "assemble", "publish"])
    ap.add_argument("--nodes", default="")
    ap.add_argument("--what", default="then,now,masks,tier")
    ap.add_argument("--face", type=int, default=0)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    {"estimate": cmd_estimate, "render": cmd_render, "assemble": cmd_assemble, "publish": cmd_publish}[a.cmd](load_site(a.slug), a)
