"""Open-world exporter. Runs Blender headless, read only on the site's .blend.

  python tools/play/export_world.py <slug> estimate [--cell court]
  python tools/play/export_world.py <slug> bake     [--cell court] [--groups a,b] [--states then,now] [--samples 96] [--device GPU|CPU] [--yes]
  python tools/play/export_world.py <slug> cards    [--cell court]      render the tree cards
  python tools/play/export_world.py <slug> publish  [--cell court]      pack everything into public/play/worlds/<slug>/v<N>/

Before any GPU work it checks nvidia-smi, then takes E:\\konark\\locks\\gpu.lock and releases it
when done, after Blender has exited. If the lock exists it stops at once: it never waits, and never
removes a lock it did not take in this run, even one that looks stale.

Bakes write only to tools/play/out/world/. Publish builds the whole version in
tools/play/out/world/_publish/, checks that every file world.json names is there, and only then
swaps it into public/. The version it replaced stays in _publish/ as v<N>.previous until the next
publish. Actors and audio are made by their own tools and are carried over from the live version.
Dialogue clips in tools/play/assets/world_voice/<slug>/ are always published.
"""
import argparse, atexit, json, math, os, shutil, subprocess, sys, time, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "play"
OUT = TOOLS / "out" / "world"
LOCK = Path(r"E:\konark\locks\gpu.lock")
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
TAG = "epocheye-play export_world"
_lock_text = None  # the exact text this run wrote to the lock, or None if it holds no lock


def gpu_state():
    q = subprocess.run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total",
                        "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=30)
    util, used, total = [int(x) for x in q.stdout.strip().split(",")]
    return util, used, total


def read_lock():
    try:
        return LOCK.read_text(errors="replace")
    except OSError:
        return ""


def take_lock():
    """Take the lock or stop. A lock that is already there is never removed, whoever wrote it and
    however dead its owner looks: no check of another process can rule out a race with a live job."""
    global _lock_text
    util, used, total = gpu_state()
    if util > 25 or used > total / 2:
        sys.exit(f"GPU busy ({util}% load, {used}/{total} MiB). Not baking.")
    try:
        fd = os.open(str(LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"GPU lock is held: {read_lock().strip()[:160]}\n"
                 f"Not baking. If that job has died, its owner clears {LOCK} by hand.")
    text = f"{TAG} pid {os.getpid()} since {time.strftime('%Y-%m-%d %H:%M:%S')} run {uuid.uuid4().hex}\n"
    try:
        os.write(fd, text.encode())
    except OSError:
        os.close(fd)
        LOCK.unlink()  # created by the O_EXCL open above, so it is ours
        raise
    os.close(fd)
    _lock_text = text
    atexit.register(release_lock)


def release_lock():
    """Remove the lock only if it still holds the exact text this run wrote."""
    global _lock_text
    if _lock_text and read_lock() == _lock_text:
        LOCK.unlink(missing_ok=True)
    _lock_text = None


def stop_child(p):
    """Blender must be gone before the lock is released, or it keeps the GPU with no lock held."""
    if p.poll() is not None:
        return
    p.terminate()
    try:
        p.wait(timeout=30)
    except subprocess.TimeoutExpired:
        p.kill()
        p.wait()


def run_build(world, site, args, log):
    cmd = [BLENDER, "-b", site["blend"], "--python", str(TOOLS / "blender" / "world_build.py"), "--",
           "--world", str(world)] + args
    t0 = time.time()
    reports = []
    skipped = []
    finished = False
    with open(log, "a", encoding="utf-8") as lf:
        lf.write("\n$ " + " ".join(cmd) + "\n")
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        try:
            for line in p.stdout:
                lf.write(line)
                finished = finished or line.startswith("WORLD_BUILD_DONE")
                if line.startswith(("@@baked", "@@target", "@@skipped")):
                    print(line.strip(), flush=True)
                if line.startswith("@@baked"):
                    reports.append(json.loads(line.split(" ", 1)[1]))
                if line.startswith("@@skipped"):
                    skipped.append(line.split(" ", 1)[1].strip())
            p.wait()
        finally:
            stop_child(p)
    # Blender exits 0 after a Python error in background mode, so only the end marker counts.
    if p.returncode != 0 or not finished:
        sys.exit(f"Blender failed (exit {p.returncode}, finished {finished}). See {log}")
    if skipped:
        sys.exit(f"Blender found nothing to bake for: {', '.join(skipped)}. See {log}")
    return reports, time.time() - t0


def sun_vector(moment):
    """Web-space direction to the sun, from the date's computed elevation and azimuth."""
    e = math.radians(moment["sun_elevation_deg"])
    a = math.radians(moment["sun_azimuth_deg"] - moment["model_y_bearing_deg"])
    x, y, z = math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)
    return [round(x, 4), round(z, 4), round(-y, 4)]


def referenced_files(world, missions):
    """Every file the game loads for this world, relative to the version folder, and any reference
    that cannot resolve to a file at all."""
    files, problems = set(), []
    for cid, cell in {**world["cells"], "base": world["base"]}.items():
        if cell.get("terrain"):
            files.add(cell["terrain"]["file"])
        for name, g in cell["groups"].items():
            files.add(f"{cid}/{name}.glb")
            for tex in {g["now"], g["then"]} - {None}:
                sizes = cell["textures"].get(tex)
                if not sizes:
                    problems.append(f"group {name}: no baked texture {tex}")
                for px in sizes or []:
                    files.add(f"{cid}/tex/{tex}_{px}.ktx2")
    files.update(world["minimap"]["images"].values())
    for key in world["cards"]:
        files.update(f"cards/{key}_{view}.ktx2" for view in ("front", "side"))
    actors = {world["actors"]["player"]} | {r["id"] for r in world["actors"].get("rides", {}).values()}
    actors |= {p["figure"] for p in world["people"]} | {n["figure"] for n in missions.get("npcs", [])}
    files.update(f"actors/{a}.glb" for a in actors)
    for lines in missions.get("dialogue", {}).values():
        for l in lines:
            if not l.get("beat"):
                files.add(f"audio/{missions['voices'][l['speaker']]}/{l['id']}.m4a")
    return files, problems


def carry_voice(slug, staged):
    """Every rendered dialogue clip ships, whether or not missions.json uses it yet, so a publish
    cannot drop lines written for a later mission. The assets folder is their source, so it wins."""
    source = ROOT / "tools" / "play" / "assets" / "world_voice" / slug
    carried = set()
    for clip in sorted(source.rglob("*.m4a")) if source.is_dir() else []:
        rel = f"audio/{clip.relative_to(source).as_posix()}"
        (staged / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(clip, staged / rel)
        carried.add(rel)
    return carried


def swap_into_place(staged, dest):
    """Replace the live version folder whole. If the second rename fails the old one goes back."""
    previous = staged.with_name(staged.name + ".previous")
    if previous.exists():
        shutil.rmtree(previous)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        os.replace(dest, previous)
    try:
        os.replace(staged, dest)
    except OSError:
        if previous.exists():
            os.replace(previous, dest)
        raise


def walk_limit(cfg):
    """The edge of the map: a closed line a set distance outside the named wall."""
    spec = cfg["terrain"]["limit"]
    plan = OUT / "plan"
    rows = json.loads((plan / "objects.json").read_text(encoding="utf-8"))["objects"]
    row = next(r for r in rows if r["name"].startswith(spec["around"]))
    import numpy as np
    with np.load(plan / f"{row['i']}.npz") as d:
        v = d["v"][:, :2]
    c = v.mean(axis=0)
    ang = np.arctan2(v[:, 1] - c[1], v[:, 0] - c[0])
    pts = []
    n = int(spec.get("points", 48))
    for k in range(n):
        a = -math.pi + math.tau * k / n
        hit = v[np.abs(np.arctan2(np.sin(ang - a), np.cos(ang - a))) < math.tau / n]
        r = float(np.hypot(*(hit - c).T).max()) + float(spec["offset"])
        pts.append([round(float(c[0] + math.cos(a) * r), 1), round(float(c[1] + math.sin(a) * r), 1)])
    return pts


def outset(poly, d):
    """A convex counter-clockwise polygon moved outward by d, keeping sharp corners."""
    n = len(poly)
    lines = []
    for i in range(n):
        (ax, ay), (bx, by) = poly[i], poly[(i + 1) % n]
        length = math.hypot(bx - ax, by - ay)
        nx, ny = (by - ay) / length, -(bx - ax) / length
        lines.append((ax + nx * d, ay + ny * d, bx - ax, by - ay))
    out = []
    for i in range(n):
        px, py, ux, uy = lines[i - 1]
        qx, qy, vx, vy = lines[i]
        t = ((qx - px) * vy - (qy - py) * vx) / (ux * vy - uy * vx)
        out.append([round(px + ux * t, 3), round(py + uy * t, 3)])
    return out


def water_block(cfg):
    """Still water from the config and the named flat objects: one convex outline per connected
    piece, with the rim's outer edge and the line people and rides stay behind."""
    spec = cfg.get("water")
    if not spec:
        return None
    import re
    import numpy as np
    plan = OUT / "plan"
    rows = json.loads((plan / "objects.json").read_text(encoding="utf-8"))["objects"]
    block = re.compile(spec["objects"])
    tanks = []
    for row in rows:
        if not block.search(row["name"]):
            continue
        with np.load(plan / f"{row['i']}.npz") as d:
            v, f = d["v"][:, :2], d["f"]
        parent = list(range(len(v)))
        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a
        for a, b, c in f.tolist():
            parent[find(b)] = find(a)
            parent[find(c)] = find(a)
        for root in sorted({find(i) for i in range(len(v))}):
            pts = sorted({(round(float(p[0]), 3), round(float(p[1]), 3)) for i, p in enumerate(v) if find(i) == root})
            def half(points):
                hull = []
                for p in points:
                    while len(hull) > 1 and (hull[-1][0] - hull[-2][0]) * (p[1] - hull[-2][1]) - (hull[-1][1] - hull[-2][1]) * (p[0] - hull[-2][0]) <= 0:
                        hull.pop()
                    hull.append(p)
                return hull[:-1]
            edge = [list(p) for p in half(pts) + half(pts[::-1])]
            tanks.append({"edge": edge, "rim": outset(edge, spec["rim_width"]), "keep": outset(edge, spec["rim_width"] + spec["keep_out"])})
    if not tanks:
        sys.exit(f"No objects match water.objects: {spec['objects']}")
    return {**{k: spec[k] for k in ("fact", "level", "rim_top", "rim_base", "deep", "shallow", "stone")}, "tanks": tanks}


def cell_entry(cell):
    groups = {}
    for name, g in cell["groups"].items():
        states = g.get("states", ["then"])
        web = g.get("web", {})
        now_state = "now" if "now" in states else "then"
        mode = web.get("mode") or ("both" if "now" in states else "then")
        groups[name] = {
            "now": f"{name}_{now_state}",
            "then": f"{name}_then" if web.get("then_atlas") else None,
            "mode": mode,
            "classes": bool(g.get("classes")),
            "collide": web.get("collide", False),
            "collide_min_area": web.get("collide_min_area", 0.03),
            "collide_era": web.get("collide_era") or ("both" if mode == "both" else "then"),
            "defer": bool(web.get("defer")),
            "ring": bool(web.get("ring")),
        }
    groups["ground"] = {"now": "ground_now", "then": "ground_then", "mode": "both", "classes": False, "collide": False}
    return groups


def publish(slug, cfg):
    from PIL import Image
    sys.path.insert(0, str(TOOLS))
    import world_maps as M
    version = cfg["version"]
    worlds = ROOT / "public" / "play" / "worlds" / slug
    dest = worlds / f"v{version}"
    carried = worlds / f"v{cfg.get('previous_version', version)}"  # actors and audio come from here
    if not carried.exists():
        carried = dest
    staged = OUT / "_publish" / slug / f"v{version}"
    if staged.exists():
        shutil.rmtree(staged)
    staged.mkdir(parents=True)
    terrain = M.load_terrain()

    # Cells with no bake of today get today's plain city ground, painted from the config.
    for cid, cell in cfg["cells"].items():
        if "now" not in cell["ground"].get("states", []):
            b = cell["bounds"]
            w = int(cell["ground"].get("now_px", 512))
            h = max(64, int(round(w * (b[3] - b[1]) / (b[2] - b[0]) / 4)) * 4)
            M.paint_today(b, w, h, cfg["today"]).save(OUT / cid / "tex" / "ground_now.png")
    M.write_base(cfg, terrain)

    def pack(cid, groups, cards):
        needed = {x for g in groups.values() for x in (g["now"], g["then"]) if x}
        # Only what the game loads is packed, so debug and unused atlases can never reach public/.
        cmd = ["node", "tools/play/pack_world.mjs", cid, "--out", str(staged), "--groups", ",".join(groups),
               "--textures", ",".join(sorted(needed))]
        subprocess.run(cmd + ([] if cards else ["--no-cards"]), cwd=ROOT, check=True, shell=False)
        manifest = json.loads((staged / cid / "manifest.json").read_text(encoding="utf-8"))
        return {k: v for k, v in manifest["textures"].items() if k in needed}

    cells = {}
    first = True
    start = cfg.get("start_cell", "court")
    grid = float(cfg["terrain"].get("grid", 2))
    for cid, cell in cfg["cells"].items():
        groups = cell_entry(cell)
        textures = pack(cid, groups, first)
        first = False
        data, meta = M.cell_heights(terrain, cell["bounds"], grid)
        (staged / cid / "height.bin").write_bytes(data)
        cells[cid] = {"id": cid, "bounds": cell["bounds"], "keep": bool(cell.get("keep")), "groups": groups, "textures": textures,
                      "terrain": {"file": f"{cid}/height.bin", **meta}}
    base_groups = {"ground": {"now": "ground_now", "then": "ground_then", "mode": "both", "classes": False, "collide": False}}
    base = {"id": "base", "groups": base_groups, "textures": pack("base", base_groups, False)}

    blocks = M.make_blocks(cfg)
    # The minimap is the whole map, from the same baked grounds.
    images = {}
    for state in ("then", "now"):
        name = f"minimap_{state}.webp"
        picture = M.map_tone(M.composite(cfg, state, int(cfg["terrain"].get("minimap_px", 900))))
        if state == "now":
            picture = M.mark_today(picture, cfg, blocks)
        picture.save(staged / name, quality=int(cfg["terrain"].get("minimap_quality", 58)), method=6)
        images[state] = name
    cards = {}
    cards_json = OUT / "cards" / "cards.json"
    if cards_json.exists():
        cards = json.loads(cards_json.read_text(encoding="utf-8"))
    missions_src = ROOT / "content" / "play" / slug / "missions.json"
    missions = json.loads(missions_src.read_text(encoding="utf-8"))
    shutil.copy(missions_src, staged / "missions.json")
    limit = walk_limit(cfg)
    bx, by = [p[0] for p in limit], [p[1] for p in limit]
    today = {k: v for k, v in cfg.get("today", {}).items() if k != "blocks"}
    today["blocks"] = {"items": blocks}
    world = {
        "slug": slug,
        "version": version,
        "ground_y": cfg["ground_z"],
        "sun": sun_vector(cfg["moment"]),
        "start_cell": start,
        "start_bounds": cfg["play_bounds"],
        "play_bounds": [min(bx), min(by), max(bx), max(by)],
        "walk_limit": limit,
        "min_walk_y": cfg["terrain"]["min_walk_y"],
        "no_ride": cfg["no_ride"],
        "resolve_top": cfg.get("resolve_top", 9),
        "era_reach": cfg.get("era_reach", 620),
        "minimap": {"bounds": cfg["terrain"]["bounds"], "images": images},
        "base": base,
        "cells": cells,
        "cards": cards,
        "actors": cfg["web_actors"],
        "people": cfg.get("people", []),
        "today": today,
    }
    water = water_block(cfg)
    if water:
        world["water"] = water
    # The ground connected to the mission start, from docs/play/lighthouse/scripts/world-reach.mjs.
    reach = TOOLS / "worlds" / f"{slug}.reach.json"
    if reach.exists():
        world["reach"] = json.loads(reach.read_text(encoding="utf-8"))
    (staged / "world.json").write_text(json.dumps(world, separators=(",", ":")), encoding="utf-8")
    files, problems = referenced_files(world, missions)
    for rel in files:
        if rel.startswith(("actors/", "audio/")) and (carried / rel).is_file():
            (staged / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(carried / rel, staged / rel)
    files.update(carry_voice(slug, staged))
    problems += [f"missing file {rel}" for rel in sorted(files) if not (staged / rel).is_file()]
    if problems:
        sys.exit("Not published, the live version is unchanged:\n  " + "\n  ".join(problems))
    swap_into_place(staged, dest)
    total = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file())
    print(json.dumps({"published": str(dest), "files": len(files), "total_mb": round(total / 1048576, 2)}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("cmd", choices=["estimate", "bake", "cards", "publish", "plan"])
    ap.add_argument("--cell", default="court"); ap.add_argument("--groups"); ap.add_argument("--states")
    ap.add_argument("--samples", type=int, default=96); ap.add_argument("--device", default="GPU")
    ap.add_argument("--yes", action="store_true"); ap.add_argument("--geometry-only", action="store_true"); ap.add_argument("--list-only", action="store_true")
    a = ap.parse_args()
    world = TOOLS / "worlds" / f"{a.slug}.json"
    cfg = json.loads(world.read_text(encoding="utf-8"))
    site = json.loads((ROOT / cfg["site"]).read_text(encoding="utf-8"))
    all_cells = a.cell == "all"
    cell_ids = list(cfg["cells"]) if all_cells else [a.cell]
    if all_cells:
        a.cell = next((c for c in cfg["cells"] if c != cfg.get("start_cell", "court")), cell_ids[0])
    cell = cfg["cells"][a.cell]
    names = list(cell["groups"]) + ["ground"]
    groups = a.groups.split(",") if a.groups else names
    OUT.mkdir(parents=True, exist_ok=True)
    log = OUT / f"{a.cell}.log"
    if a.cmd == "publish":
        publish(a.slug, cfg)
        return
    if a.cmd == "plan":
        # CPU only and read only: no render, so it needs neither the GPU nor its lock.
        dest = OUT / "plan"
        cmd = [BLENDER, "-b", site["blend"], "--python", str(TOOLS / "blender" / "world_plan.py"), "--",
               "--world", str(world), "--out", str(dest)]
        r = subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        (OUT / "plan.log").write_text(r.stdout, encoding="utf-8")
        if "WORLD_PLAN_DONE" not in r.stdout:
            sys.exit(f"Plan failed. See {OUT / 'plan.log'}")
        print(next(l for l in r.stdout.splitlines() if l.startswith("WORLD_PLAN_DONE")))
        return
    if a.cmd == "cards" and a.list_only:
        cmd = [BLENDER, "-b", site["blend"], "--python", str(TOOLS / "blender" / "world_cards.py"), "--", "--world", str(world),
               "--cell", a.cell, "--out", str(OUT / "cards"), "--list-only"]
        r = subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        if "WORLD_CARDS_DONE" not in r.stdout:
            sys.exit("Card listing failed: " + r.stdout[-800:])
        print(" ".join(l for l in r.stdout.splitlines() if l.startswith("@@card")))
        return
    if a.device.upper() == "GPU" and not a.geometry_only:
        take_lock()

    if a.cmd == "cards":
        cmd = [BLENDER, "-b", site["blend"], "--python", str(TOOLS / "blender" / "world_cards.py"), "--", "--world", str(world),
               "--cell", a.cell, "--out", str(OUT / "cards"), "--device", a.device]
        r = subprocess.run(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        with open(log, "a", encoding="utf-8") as lf:
            lf.write(r.stdout)
        if "WORLD_CARDS_DONE" not in r.stdout:
            sys.exit(f"Card render failed. See {log}")
        print("\n".join(l for l in r.stdout.splitlines() if l.startswith("@@card")))
        return

    if a.cmd == "estimate":
        probe = OUT / f"{a.cell}_probe"
        # Two sizes, so the fixed cost of loading the scene onto the GPU is not scaled up with the pixels.
        probe_group = "palace" if "palace" in cell["groups"] else next(iter(cell["groups"]))
        small, t_small = run_build(world, site, ["--cell", a.cell, "--out", str(probe), "--groups", probe_group,
                                                 "--states", "then", "--scale", "0.125", "--samples", "32", "--device", a.device], log)
        large, _ = run_build(world, site, ["--cell", a.cell, "--out", str(probe), "--groups", probe_group,
                                           "--states", "then", "--scale", "0.375", "--samples", "32", "--device", a.device], log)

        def fit(kind):
            s = next(r for r in small if r["kind"] == kind)
            l = next(r for r in large if r["kind"] == kind)
            per_px = max(l["seconds"] - s["seconds"], 0.01) / max(l["px"] ** 2 - s["px"] ** 2, 1)
            return max(s["seconds"] - per_px * s["px"] ** 2, 0), per_px

        light_fixed, light_px = fit("light")   # per pixel at 32 samples
        albedo_fixed, albedo_px = fit("albedo")  # per pixel at 4 samples
        total = 0
        per_cell = {}
        for cid in cell_ids:
            c = cfg["cells"][cid]
            # Each cell is one Blender run: scene load and build, measured from the small probe.
            secs = max(t_small - sum(r["seconds"] for r in small), 0)
            for g in (list(c["groups"]) + ["ground"]) if all_cells else groups:
                spec = c["ground"] if g == "ground" else c["groups"][g]
                for _state in spec.get("states", ["then"]):
                    lpx = max(128, spec["atlas"] // 2)
                    secs += light_fixed + lpx ** 2 * light_px * a.samples / 32
                    secs += albedo_fixed + spec["atlas"] ** 2 * albedo_px
            per_cell[cid] = round(secs / 60, 1)
            total += secs
        print(json.dumps({"probe": f"{a.cell}/{probe_group}", "small": small, "large": large,
                          "fixed_seconds_per_bake": round(light_fixed + albedo_fixed, 1), "samples": a.samples,
                          "minutes_per_cell": per_cell, "estimate_hours": round(total / 3600, 2),
                          "note": "Fitted from two probes. Other groups may differ."}, indent=1))
        return

    done = 0
    t0 = time.time()
    # One lock for the whole run, so another job cannot slip in between two cells.
    for cid in cell_ids:
        c = cfg["cells"][cid]
        wanted = a.groups.split(",") if a.groups else list(c["groups"]) + ["ground"]
        args = ["--cell", cid, "--out", str(OUT / cid), "--groups", ",".join(wanted),
                "--samples", str(a.samples), "--device", a.device]
        if a.states:
            args += ["--states", a.states]
        if a.geometry_only:
            args += ["--geometry-only"]
        reports, _ = run_build(world, site, args, OUT / f"{cid}.log")
        done += len(reports)
    print(json.dumps({"cells": cell_ids, "baked": done, "minutes": round((time.time() - t0) / 60, 1)}))


if __name__ == "__main__":
    main()
