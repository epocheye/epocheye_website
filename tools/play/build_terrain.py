"""Builds the walkable height map of a world from the plan export.

  python tools/play/build_terrain.py <slug>

Reads tools/play/out/world/plan/ (made by `export_world.py <slug> plan`) and the "terrain" block of
the world config. Writes tools/play/out/world/terrain.npz:
  h     ground height per metre, what the ground mesh is built from
  walk  the same, with places a person may not stand pushed far below min_walk_y
"""
import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools" / "play" / "out" / "world"


def raster(h, x0, y0, step, v, f, keep_max=True):
    """Writes each triangle's height into h, keeping the highest surface."""
    for t in v[f]:
        lo = np.floor((t[:, :2].min(0) - [x0, y0]) / step).astype(int)
        hi = np.ceil((t[:, :2].max(0) - [x0, y0]) / step).astype(int)
        i0, j0 = max(lo[0], 0), max(lo[1], 0)
        i1, j1 = min(hi[0], h.shape[1] - 1), min(hi[1], h.shape[0] - 1)
        if i1 < i0 or j1 < j0:
            continue
        xs = x0 + np.arange(i0, i1 + 1) * step
        ys = y0 + np.arange(j0, j1 + 1) * step
        X, Y = np.meshgrid(xs, ys)
        d = (t[1, 1] - t[2, 1]) * (t[0, 0] - t[2, 0]) + (t[2, 0] - t[1, 0]) * (t[0, 1] - t[2, 1])
        if abs(d) < 1e-9:
            continue
        a = ((t[1, 1] - t[2, 1]) * (X - t[2, 0]) + (t[2, 0] - t[1, 0]) * (Y - t[2, 1])) / d
        b = ((t[2, 1] - t[0, 1]) * (X - t[2, 0]) + (t[0, 0] - t[2, 0]) * (Y - t[2, 1])) / d
        c = 1 - a - b
        inside = (a >= -1e-4) & (b >= -1e-4) & (c >= -1e-4)
        if not inside.any():
            continue
        z = a * t[0, 2] + b * t[1, 2] + c * t[2, 2]
        win = h[j0:j1 + 1, i0:i1 + 1]
        if keep_max:
            win[inside] = np.maximum(win[inside], z[inside])
        else:
            win[inside] = z[inside]


def main():
    slug = sys.argv[1]
    cfg = json.loads((ROOT / "tools" / "play" / "worlds" / f"{slug}.json").read_text(encoding="utf-8"))
    spec = cfg["terrain"]
    plan = OUT / "plan"
    objects = json.loads((plan / "objects.json").read_text(encoding="utf-8"))["objects"]
    x0, y0, x1, y1 = spec["bounds"]
    step = float(spec.get("step", 1.0))
    nx, ny = int(round((x1 - x0) / step)) + 1, int(round((y1 - y0) / step)) + 1
    h = np.full((ny, nx), -100.0, np.float32)
    src = re.compile(spec["sources"])
    used = []
    for o in objects:
        if not src.search(o["name"]):
            continue
        with np.load(plan / f"{o['i']}.npz") as d:
            raster(h, x0, y0, step, d["v"], d["f"])
        used.append(o["name"][:40])
    missing = float((h <= -99).mean())
    if missing > 0:
        # Beyond the modelled ground: the plain level of the site.
        h[h <= -99] = float(cfg["ground_z"])
    walk = h.copy()
    block = re.compile(spec["no_walk"]) if spec.get("no_walk") else None
    blocked = 0
    if block:
        mask = np.full(h.shape, -100.0, np.float32)
        for o in objects:
            if block.search(o["name"]):
                with np.load(plan / f"{o['i']}.npz") as d:
                    raster(mask, x0, y0, step, d["v"], d["f"])
        hit = mask > -99
        blocked = int(hit.sum())
        walk[hit] = float(spec["min_walk_y"]) - 5
    np.savez_compressed(OUT / "terrain.npz", h=h, walk=walk, x0=x0, y0=y0, step=step)
    print(json.dumps({"sources": used, "size": [nx, ny], "off_model": round(missing, 4), "blocked_m2": blocked,
                      "min": round(float(h.min()), 2), "max": round(float(h.max()), 2)}, indent=1))


if __name__ == "__main__":
    main()
