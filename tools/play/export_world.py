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
    for cid, cell in world["cells"].items():
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


def publish(slug, cfg, cell_id):
    from PIL import Image
    version = cfg["version"]
    dest = ROOT / "public" / "play" / "worlds" / slug / f"v{version}"
    staged = OUT / "_publish" / slug / f"v{version}"
    if staged.exists():
        shutil.rmtree(staged)
    staged.mkdir(parents=True)
    cell = cfg["cells"][cell_id]
    groups = {}
    for name, g in cell["groups"].items():
        states = g.get("states", ["then"])
        web = g.get("web", {})
        now_state = "now" if "now" in states else "then"
        groups[name] = {
            "now": f"{name}_{now_state}",
            "then": f"{name}_then" if web.get("then_atlas") else None,
            "mode": "both" if "now" in states else "then",
            "classes": bool(g.get("classes")),
            "collide": web.get("collide", False),
            "collide_min_area": web.get("collide_min_area", 0.03),
        }
    groups["ground"] = {"now": "ground_now", "then": "ground_then", "mode": "both", "classes": False, "collide": False}
    needed = {x for g in groups.values() for x in (g["now"], g["then"]) if x}
    # Only what the game loads is packed, so debug and unused atlases can never reach public/.
    subprocess.run(["node", "tools/play/pack_world.mjs", cell_id, "--out", str(staged),
                    "--groups", ",".join(groups), "--textures", ",".join(sorted(needed))],
                   cwd=ROOT, check=True, shell=False)
    manifest = json.loads((staged / cell_id / "manifest.json").read_text(encoding="utf-8"))
    # Minimap from the baked ground itself.
    tex = OUT / cell_id / "tex"
    images = {}
    for state in ("then", "now"):
        name = f"minimap_{state}.webp"
        Image.open(tex / f"ground_{state}.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(staged / name, quality=72, method=6)
        images[state] = name
    cards = {}
    cards_json = OUT / "cards" / "cards.json"
    if cards_json.exists():
        cards = json.loads(cards_json.read_text(encoding="utf-8"))
    missions_src = ROOT / "content" / "play" / slug / "missions.json"
    missions = json.loads(missions_src.read_text(encoding="utf-8"))
    shutil.copy(missions_src, staged / "missions.json")
    world = {
        "slug": slug,
        "version": version,
        "ground_y": cfg["ground_z"],
        "sun": sun_vector(cfg["moment"]),
        "start_cell": cell_id,
        "play_bounds": cfg["play_bounds"],
        "no_ride": cfg["no_ride"],
        "resolve_top": cfg.get("resolve_top", 9),
        "era_reach": cfg.get("era_reach", 620),
        "minimap": {"bounds": cell["bounds"], "images": images},
        "cells": {cell_id: {"id": cell_id, "bounds": cell["bounds"], "groups": groups,
                            "textures": {k: v for k, v in manifest["textures"].items() if k in needed}}},
        "cards": cards,
        "actors": cfg["web_actors"],
        "people": cfg.get("people", []),
        "today": cfg.get("today", {}),
    }
    (staged / "world.json").write_text(json.dumps(world, separators=(",", ":")), encoding="utf-8")
    files, problems = referenced_files(world, missions)
    for rel in files:
        if rel.startswith(("actors/", "audio/")) and (dest / rel).is_file():
            (staged / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dest / rel, staged / rel)
    problems += [f"missing file {rel}" for rel in sorted(files) if not (staged / rel).is_file()]
    if problems:
        sys.exit("Not published, the live version is unchanged:\n  " + "\n  ".join(problems))
    swap_into_place(staged, dest)
    total = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file())
    print(json.dumps({"published": str(dest), "files": len(files), "total_mb": round(total / 1048576, 2)}))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug"); ap.add_argument("cmd", choices=["estimate", "bake", "cards", "publish"])
    ap.add_argument("--cell", default="court"); ap.add_argument("--groups"); ap.add_argument("--states")
    ap.add_argument("--samples", type=int, default=96); ap.add_argument("--device", default="GPU")
    ap.add_argument("--yes", action="store_true")
    a = ap.parse_args()
    world = TOOLS / "worlds" / f"{a.slug}.json"
    cfg = json.loads(world.read_text(encoding="utf-8"))
    site = json.loads((ROOT / cfg["site"]).read_text(encoding="utf-8"))
    cell = cfg["cells"][a.cell]
    names = list(cell["groups"]) + ["ground"]
    groups = a.groups.split(",") if a.groups else names
    OUT.mkdir(parents=True, exist_ok=True)
    log = OUT / f"{a.cell}.log"
    if a.cmd == "publish":
        publish(a.slug, cfg, a.cell)
        return
    if a.device.upper() == "GPU":
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
        small, _ = run_build(world, site, ["--cell", a.cell, "--out", str(probe), "--groups", "palace",
                                           "--states", "then", "--scale", "0.125", "--samples", "32", "--device", a.device], log)
        large, _ = run_build(world, site, ["--cell", a.cell, "--out", str(probe), "--groups", "palace",
                                           "--states", "then", "--scale", "0.375", "--samples", "32", "--device", a.device], log)

        def fit(kind):
            s = next(r for r in small if r["kind"] == kind)
            l = next(r for r in large if r["kind"] == kind)
            per_px = max(l["seconds"] - s["seconds"], 0.01) / max(l["px"] ** 2 - s["px"] ** 2, 1)
            return max(s["seconds"] - per_px * s["px"] ** 2, 0), per_px

        light_fixed, light_px = fit("light")   # per pixel at 32 samples
        albedo_fixed, albedo_px = fit("albedo")  # per pixel at 4 samples
        total = 0
        for g in groups:
            spec = cell["ground"] if g == "ground" else cell["groups"][g]
            for _state in spec.get("states", ["then"]):
                lpx = max(128, spec["atlas"] // 2)
                total += light_fixed + lpx ** 2 * light_px * a.samples / 32
                total += albedo_fixed + spec["atlas"] ** 2 * albedo_px
        print(json.dumps({"small": small, "large": large, "fixed_seconds_per_bake": round(light_fixed + albedo_fixed, 1),
                          "estimate_hours": round(total / 3600, 2),
                          "note": "Fitted from two probes on the palace. Other groups may differ."}, indent=1))
        return

    args = ["--cell", a.cell, "--out", str(OUT / a.cell), "--groups", ",".join(groups),
            "--samples", str(a.samples), "--device", a.device]
    if a.states:
        args += ["--states", a.states]
    reports, secs = run_build(world, site, args, log)
    print(json.dumps({"baked": len(reports), "minutes": round(secs / 60, 1)}))


if __name__ == "__main__":
    main()
