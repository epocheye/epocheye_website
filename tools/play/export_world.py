"""Open-world exporter. Runs Blender headless, read only on the site's .blend.

  python tools/play/export_world.py <slug> estimate [--cell court]
  python tools/play/export_world.py <slug> bake     [--cell court] [--groups a,b] [--states then,now] [--samples 96] [--device GPU|CPU] [--yes]
  python tools/play/export_world.py <slug> cards    [--cell court]      render the tree cards
  python tools/play/export_world.py <slug> publish  [--cell court]      pack everything into public/play/worlds/<slug>/v<N>/

Before any GPU work it checks nvidia-smi, then takes E:\\konark\\locks\\gpu.lock and releases it
when done. If another job holds the lock it stops at once and never waits or overrides it.
Writes only to tools/play/out/world/.
"""
import argparse, atexit, json, math, os, re, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "play"
OUT = TOOLS / "out" / "world"
LOCK = Path(r"E:\konark\locks\gpu.lock")
BLENDER = r"C:\Program Files\Blender Foundation\Blender 5.3\blender.exe"
TAG = "epocheye-play export_world"
_held = False


def gpu_state():
    q = subprocess.run(["nvidia-smi", "--query-gpu=utilization.gpu,memory.used,memory.total",
                        "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=30)
    util, used, total = [int(x) for x in q.stdout.strip().split(",")]
    return util, used, total


def clear_own_stale_lock():
    """Remove a lock only if this exporter wrote it and its process and Blender are both gone.
    A lock written by anything else is never touched."""
    if not LOCK.exists():
        return
    m = re.match(re.escape(TAG) + r" pid (\d+) ", LOCK.read_text(errors="replace"))
    if not m:
        return
    tasks = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True, timeout=30).stdout
    alive = f'"{m.group(1)}"' in tasks
    if not alive and "blender.exe" not in tasks.lower():
        LOCK.unlink()


def take_lock():
    global _held
    util, used, total = gpu_state()
    if util > 25 or used > total / 2:
        sys.exit(f"GPU busy ({util}% load, {used}/{total} MiB). Not baking.")
    clear_own_stale_lock()
    try:
        fd = os.open(str(LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"GPU lock is held: {LOCK.read_text(errors='replace').strip()[:160]}")
    os.write(fd, f"{TAG} pid {os.getpid()} since {time.strftime('%Y-%m-%d %H:%M:%S')}\n".encode())
    os.close(fd)
    _held = True
    atexit.register(release_lock)


def release_lock():
    global _held
    if _held and LOCK.exists() and LOCK.read_text(errors="replace").startswith(f"{TAG} pid {os.getpid()} "):
        LOCK.unlink()
    _held = False


def run_build(world, site, args, log):
    cmd = [BLENDER, "-b", site["blend"], "--python", str(TOOLS / "blender" / "world_build.py"), "--",
           "--world", str(world)] + args
    t0 = time.time()
    reports = []
    finished = False
    with open(log, "a", encoding="utf-8") as lf:
        lf.write("\n$ " + " ".join(cmd) + "\n")
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace")
        for line in p.stdout:
            lf.write(line)
            finished = finished or line.startswith("WORLD_BUILD_DONE")
            if line.startswith("@@baked") or line.startswith("@@target"):
                print(line.strip(), flush=True)
            if line.startswith("@@baked"):
                reports.append(json.loads(line.split(" ", 1)[1]))
        p.wait()
    # Blender exits 0 after a Python error in background mode, so only the end marker counts.
    if p.returncode != 0 or not finished:
        sys.exit(f"Blender failed (exit {p.returncode}, finished {finished}). See {log}")
    return reports, time.time() - t0


def sun_vector(moment):
    """Web-space direction to the sun, from the date's computed elevation and azimuth."""
    e = math.radians(moment["sun_elevation_deg"])
    a = math.radians(moment["sun_azimuth_deg"] - moment["model_y_bearing_deg"])
    x, y, z = math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)
    return [round(x, 4), round(z, 4), round(-y, 4)]


def publish(slug, cfg, cell_id):
    from PIL import Image
    version = cfg["version"]
    dest = ROOT / "public" / "play" / "worlds" / slug / f"v{version}"
    subprocess.run(["node", "tools/play/pack_world.mjs", slug, cell_id, "--version", str(version)], cwd=ROOT, check=True, shell=False)
    cell = cfg["cells"][cell_id]
    manifest = json.loads((dest / cell_id / "manifest.json").read_text(encoding="utf-8"))
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
    # Minimap from the baked ground itself.
    tex = OUT / cell_id / "tex"
    images = {}
    for state in ("then", "now"):
        name = f"minimap_{state}.webp"
        Image.open(tex / f"ground_{state}.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(dest / name, quality=72, method=6)
        images[state] = name
    cards = {}
    cards_json = OUT / "cards" / "cards.json"
    if cards_json.exists():
        cards = json.loads(cards_json.read_text(encoding="utf-8"))
    shutil.copy(ROOT / "content" / "play" / slug / "missions.json", dest / "missions.json")
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
    (dest / "world.json").write_text(json.dumps(world, separators=(",", ":")), encoding="utf-8")
    total = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file())
    print(json.dumps({"published": str(dest), "total_mb": round(total / 1048576, 2)}))


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
