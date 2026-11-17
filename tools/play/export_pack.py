#!/usr/bin/env python
"""Epocheye Play: site pack exporter.

Turns a site's Blender project plus one hand-written story.json into a pack the
engine can load. Runs Blender only in the background (blender -b), never the open
window or its connector, and never saves the site's .blend.

  python tools/play/export_pack.py <slug> estimate          # render hours, no final rendering
  python tools/play/export_pack.py <slug> render [--nodes a,b] [--what then,now,masks,tier] --yes
  python tools/play/export_pack.py <slug> lookdev --nodes a [--face 384] [--what then] [--exposure EV]
                                   [--set key=value,...] [--faces px,pz] [--tag name]   # small test frames
  python tools/play/export_pack.py <slug> pieces            # the 3D piece of each restoration, as GLB
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


GPU_JOB_WATTS = 20.0     # see _gpu_busy_once


def _gpu_busy_once():
    """One look at the GPU. A lock file always means busy. Otherwise another job counts as using the
    GPU when utilisation is above 25 percent AND the card is drawing real power (above GPU_JOB_WATTS),
    or when more than half its memory is held.
    Why power as well: on this laptop card the utilisation figure is relative to a throttled clock, so
    a web browser compositing a page reads 25 to 40 percent while the card idles at 6 to 15 W in a low
    power state. A Cycles render on the same card reads above 90 percent at about 30 W. Measured on
    2026-11-16. If the driver does not report power, utilisation alone decides, as before."""
    for lock in GPU_LOCKS:
        if os.path.exists(lock):
            return f"lock file present: {lock}"
    try:
        samples = []
        for _ in range(3):
            q = subprocess.run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total,power.draw",
                                "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=20)
            f = [x.strip() for x in q.stdout.strip().splitlines()[0].split(",")]
            try:
                watts = float(f[3])
            except (ValueError, IndexError):
                watts = None
            samples.append([float(f[0]), float(f[1]), float(f[2]), watts])
            time.sleep(1)
        used, total = samples[-1][1], samples[-1][2]
        working = [s for s in samples if s[0] > 25 and (s[3] is None or s[3] > GPU_JOB_WATTS)]
        if working:
            w = max(working, key=lambda s: s[0])
            return (f"GPU is in use by another job ({w[0]:.0f}% utilisation"
                    + (f", {w[3]:.0f} W)" if w[3] is not None else ")"))
        if used > 0.5 * total:
            return f"GPU memory is held by another job ({used:.0f} of {total:.0f} MiB)"
    except Exception as e:
        return f"nvidia-smi unavailable ({e})"
    return None


def gpu_busy(settle=60):
    """Return a reason string if the GPU must not be used now, else None.
    The utilisation figure lags by a few seconds, so the tail of our own last Blender process can
    read as another job. If the GPU reads busy, look again for up to `settle` seconds and only
    start once it reads idle. A lock file is never waited on: it stops the run at once."""
    t0 = time.time()
    while True:
        busy = _gpu_busy_once()
        if not busy or "lock file" in busy or time.time() - t0 > settle:
            return busy
        time.sleep(5)


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
    """Time two small probes per kind of node and fit time = fixed cost per viewpoint + cost per pixel.
    (Scaling one probe by pixel count alone overstated the first pack about five times, because
    scene sync and the BVH build cost the same at any size.)"""
    busy = gpu_busy()
    if busy:
        sys.exit(f"Not probing: {busy}")
    wd = work_dir(site)
    probes = (192, 384)
    face_px = a.face or site.get("face_px", 2048)
    nodes = pick_nodes(site, a)
    kinds = {}
    for n in nodes:
        kinds.setdefault(n.get("kind", "exterior"), n)
    rate = {}
    for kind, n in kinds.items():
        samples = n.get("samples", site.get("samples", 128))
        t, load = {}, 0
        for px in probes:
            busy = gpu_busy()
            if busy:
                sys.exit(f"Not probing: {busy}")
            rep, wall, rc = run_blender(site, "render_node.py",
                                        ["--site", site["_path"], "--node", n["id"], "--out", str(wd / "_probe" / str(px)),
                                         "--what", "then", "--face", str(px), "--samples", str(samples), "--force"],
                                        wd / "export.log")
            secs = next((r["seconds"].get("then") for r in rep if "seconds" in r), None)
            if not secs:
                sys.exit(f"probe failed for {n['id']} (see {wd / 'export.log'})")
            t[px] = secs; load = wall - secs
            print(f"probe {kind:9s} node {n['id']}: {secs:.0f} s for 6 faces at {px}px, {samples} spp, load {load:.0f} s", flush=True)
        per_px = (t[probes[1]] - t[probes[0]]) / (probes[1] ** 2 - probes[0] ** 2)
        fixed = t[probes[0]] - per_px * probes[0] ** 2
        if per_px <= 0 or fixed < 0:       # noisy probes: fall back to scaling by pixels alone
            per_px, fixed = t[probes[1]] / probes[1] ** 2, 0.0
        rate[kind] = {"probe_seconds": t, "fixed_seconds": fixed, "seconds_per_px": per_px,
                      "load_seconds": load, "samples": samples, "probe_node": n["id"]}
    total = 0
    per_node = {}
    for n in nodes:
        r = rate[n.get("kind", "exterior")]
        spp = n.get("samples", site.get("samples", 128)) / r["samples"]
        beauty = r["fixed_seconds"] + r["seconds_per_px"] * face_px ** 2 * spp
        masks = 6 * 4 * (1 + sum(1 for x in site["restorations"] if n["id"] in x["nodes"]))
        node_total = 2 * beauty + masks + 2 * r["load_seconds"]
        total += node_total
        per_node[n["id"]] = node_total / 60
        print(f"  {n['id']:16s} then+now {2 * beauty / 60:6.1f} min, masks {masks / 60:4.1f} min")
    print(f"ESTIMATE: {total / 3600:.1f} hours of GPU for {len(nodes)} nodes at {face_px}px faces "
          f"(fitted from {probes[0]}px and {probes[1]}px probes of one node per kind; other nodes of a kind "
          f"can differ, so treat it as plus or minus a half).")
    (wd / "estimate.json").write_text(json.dumps({"hours": total / 3600, "rate": rate, "nodes": [n["id"] for n in nodes],
                                                  "minutes_per_node": per_node, "face_px": face_px}, indent=1))


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
            busy = None if a.device == "CPU" else gpu_busy()
            if busy:
                sys.exit(f"Stopping before node {n['id']}: {busy}. Finished faces are kept; run again to resume, "
                         f"or add --device CPU to render slowly without the GPU.")
            args = ["--site", site["_path"], "--node", n["id"], "--out", str(raw), "--what", ",".join(g), "--device", a.device]
            if a.face:
                args += ["--face", str(a.face)]
            if a.force:
                args += ["--force"]
            rep, wall, rc = run_blender(site, "render_node.py", args, wd / "export.log")
            secs = next((r.get("seconds") for r in rep if "seconds" in r), None)
            print(f"{n['id']:16s} {','.join(g):16s} {wall / 60:5.1f} min", secs, flush=True)
            with open(wd / "render_times.jsonl", "a", encoding="utf-8") as tf:      # the real minutes, for the audit
                tf.write(json.dumps({"node": n["id"], "what": g, "face_px": a.face or site.get("face_px", 2048),
                                     "wall_seconds": round(wall, 1), "seconds": secs, "returncode": rc,
                                     "at": time.strftime("%Y-%m-%d %H:%M:%S")}) + "\n")
            if rc != 0 or secs is None:
                sys.exit(f"Blender failed on node {n['id']} ({','.join(g)}); see {wd / 'export.log'}")


def cmd_lookdev(site, a):
    """Small test frames for look development, into tools/play/out/lookdev/<tag>/<node>/.
    Same GPU guard as the real render. Never touches the raw render folders."""
    out = OUT / "lookdev" / (a.tag or "test")
    out.mkdir(parents=True, exist_ok=True)
    what = "then" if a.what == "then,now,masks,tier" else a.what
    for n in pick_nodes(site, a):
        for w in what.split(","):      # NOW needs its own process (its material swaps are not undone)
            busy = None if a.device == "CPU" else gpu_busy()
            if busy:
                sys.exit(f"Not rendering {n['id']}: {busy}.")
            args = ["--site", site["_path"], "--node", n["id"], "--out", str(out), "--what", w,
                    "--face", str(a.face or 384), "--device", a.device, "--force"]
            if a.samples:
                args += ["--samples", str(a.samples)]
            if a.exposure is not None:
                args += ["--exposure", str(a.exposure)]
            if a.set:
                args += ["--set", a.set]
            if a.faces:
                args += ["--faces", a.faces]
            if a.loc:
                args += ["--loc", a.loc]
            rep, wall, rc = run_blender(site, "render_node.py", args, OUT / "lookdev" / "lookdev.log")
            print(f"{n['id']:16s} {w:6s} {wall:5.0f} s", rep, flush=True)


def cmd_pieces(site, a):
    """Export each restoration's handled piece as a GLB (CPU only, no rendering)."""
    wd = work_dir(site)
    for r in site["restorations"]:
        if not r.get("piece_source"):
            continue
        out = wd / "pack" / r["piece"]
        rep, wall, rc = run_blender(site, "export_piece.py",
                                    ["--site", site["_path"], "--restoration", r["id"], "--out", str(out),
                                     "--tmp", str(wd / "_tex")], wd / "export.log")
        print(r["id"], rep or f"failed (see {wd / 'export.log'})")


def write_evidence(site, pack):
    """Evidence images named in the site config: pack/evidence/<id>.webp, longest side 1600 px.
    An entry without a holder and a licence, or whose file is missing, is skipped and reported."""
    from PIL import Image, ImageOps
    out, skipped = [], []
    dst = pack / "evidence"
    if dst.exists():
        shutil.rmtree(dst)
    for e in site.get("evidence_images", []):
        src = Path(e.get("source", ""))
        if not (e.get("holder") and e.get("licence")):
            skipped.append((e["id"], "no holder or licence recorded")); continue
        if not src.is_file():
            skipped.append((e["id"], f"file not on disk: {src}")); continue
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        if e.get("crop"):                       # fractions of the upright image: left, top, right, bottom
            l, t, r, b = e["crop"]
            im = im.crop((round(l * im.width), round(t * im.height), round(r * im.width), round(b * im.height)))
        if e.get("rotate_cw"):
            im = im.rotate(-int(e["rotate_cw"]), expand=True)
        im.thumbnail((int(e.get("max_px", 1600)),) * 2, Image.LANCZOS)
        dst.mkdir(parents=True, exist_ok=True)
        f = dst / f"{e['id']}.webp"
        im.save(f, quality=int(e.get("quality", 88)), method=6)
        out.append({"id": e["id"], "file": f"evidence/{e['id']}.webp", "w": im.width, "h": im.height,
                    "title": e.get("title"), "credit": e.get("credit"), "holder": e["holder"], "licence": e["licence"]})
        print(f"evidence {e['id']}: {im.width}x{im.height}, {f.stat().st_size / 1e3:.0f} KB")
    for i, why in skipped:
        print(f"evidence SKIPPED {i}: {why}")
    return out


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
                src = nd / f"{state}_{f}.png"
                with Image.open(src) as probe:
                    width = probe.width
                top = max(top, width)
                todo = [s for s in sizes if s <= width and not (
                    (pack / "pano" / n["id"] / state / str(s) / f"{f}.webp").exists()
                    and (pack / "pano" / n["id"] / state / str(s) / f"{f}.webp").stat().st_mtime >= src.stat().st_mtime)]
                if not todo:
                    continue            # already encoded from this render
                im = Image.open(src).convert("RGB")
                for s in todo:
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
        node_out.append({**{k: v for k, v in n.items() if k not in ("samples", "exposure", "cycles")},
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
    evidence = write_evidence(site, pack)
    # A restoration is listed for exactly the viewpoints that carry its mask. A viewpoint named in the
    # config whose mask came out empty cannot see it; say so, so the config can be put right.
    restorations = []
    for r in site["restorations"]:
        seen = [n["id"] for n in node_out if r["id"] in n["masks"]]
        rendered = [n["id"] for n in node_out]
        extra = [x for x in r["nodes"] if x in rendered and x not in seen]
        if extra:
            print(f"note: {r['id']} is not visible from {', '.join(extra)} (empty mask); left out of site.json")
        restorations.append({**{k: v for k, v in r.items() if k != "select"}, "nodes": seen})
    # Give every story evidence item that shows a pack image its pixel size, so the card can
    # reserve the right box. Items naming an image the pack does not have are reported.
    if story:
        by_file = {e["file"]: e for e in evidence}
        for item in story.get("evidence", []):
            img = item.get("image")
            if not img:
                continue
            e = by_file.get(img)
            if e:
                item["image_width"], item["image_height"] = e["w"], e["h"]
                item.setdefault("credit", e.get("credit"))
            else:
                print(f"note: evidence {item['id']} names {img}, which this pack does not have; the card will hide it")
    site_json = {
        "format": 1, "mode": "pano",
        "site": {"slug": site["slug"], "name": site["name"], "place": site.get("place"), "version": site["version"],
                 "axes": "z-up", "faces": FACES, "face_axes": FACE_AXES,
                 "sizes": [s for s in sizes if s <= top], "mask_layout": "strip6",
                 "start_node": site.get("start_node")},
        "nodes": node_out,
        "restorations": restorations,
        "figures": site.get("figures", []),
        "evidence_images": evidence,
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
    # Replace only what the exporter owns. audio/ is written by tools/play/voice and must survive.
    for owned in ("pano", "mask", "tier", "pieces", "options", "evidence", "sprites", "share"):
        if (dst / owned).exists():
            shutil.rmtree(dst / owned)
    shutil.copytree(src, dst, dirs_exist_ok=True)
    print("published", dst)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("cmd", choices=["estimate", "render", "lookdev", "pieces", "assemble", "publish"])
    ap.add_argument("--nodes", default="")
    ap.add_argument("--what", default="then,now,masks,tier")
    ap.add_argument("--face", type=int, default=0)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--device", default="GPU", choices=["GPU", "CPU"])
    ap.add_argument("--samples", type=int, default=0, help="lookdev only")
    ap.add_argument("--exposure", type=float, default=None, help="lookdev only")
    ap.add_argument("--set", default="", help="lookdev only: Cycles settings, key=value,key=value")
    ap.add_argument("--faces", default="", help="lookdev only: px,nx,py,ny,pz,nz")
    ap.add_argument("--tag", default="", help="lookdev only: output subfolder")
    ap.add_argument("--loc", default="", help="lookdev only: try another camera position, x,y,z (use --loc=-1,2,3 for negatives)")
    a = ap.parse_args()
    {"estimate": cmd_estimate, "render": cmd_render, "lookdev": cmd_lookdev, "pieces": cmd_pieces, "assemble": cmd_assemble, "publish": cmd_publish}[a.cmd](load_site(a.slug), a)
