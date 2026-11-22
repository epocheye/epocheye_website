"""Whole-map products for a world, built at publish from the baked cells and the height raster:
per-cell height files, today's ground, the composite ground, the low-detail base and the city blocks.
Used by export_world.py. Holds no site-specific values: all of them come from the world config.
"""
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tools" / "play" / "out" / "world"
HEIGHT_ZERO = 20.0  # stored heights are centimetres above this depth


def load_terrain():
    with np.load(OUT / "terrain.npz") as d:
        return {k: d[k].copy() for k in ("h", "walk")} | {k: float(d[k]) for k in ("x0", "y0", "step")}


def sample(t, key, xs, ys):
    """Bilinear samples of a raster on the grid xs by ys. Returns [len(ys), len(xs)]."""
    h = t[key]
    fx = np.clip((xs - t["x0"]) / t["step"], 0, h.shape[1] - 1.001)
    fy = np.clip((ys - t["y0"]) / t["step"], 0, h.shape[0] - 1.001)
    i, j = fx.astype(int), fy.astype(int)
    tx, ty = (fx - i)[None, :], (fy - j)[:, None]
    a, b = h[np.ix_(j, i)], h[np.ix_(j, i + 1)]
    c, d = h[np.ix_(j + 1, i)], h[np.ix_(j + 1, i + 1)]
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty


def encode_heights(arr):
    """Row by row, as deltas of centimetres: 0x00 n n is a run of no change, 0xFF v v an absolute
    value, and any other byte a small delta (byte - 128)."""
    values = np.clip(np.round((arr.ravel() + HEIGHT_ZERO) * 100), 0, 65535).astype(np.int64)
    out = bytearray()
    prev, i, n = 0, 0, len(values)
    while i < n:
        d = int(values[i] - prev)
        if d == 0:
            run = 1
            while i + run < n and values[i + run] == prev and run < 65535:
                run += 1
            out += bytes((0, run & 255, run >> 8))
            i += run
            continue
        if -120 <= d <= 120:
            out.append(d + 128)
        else:
            v = int(values[i])
            out += bytes((255, v & 255, v >> 8))
        prev = int(values[i])
        i += 1
    return bytes(out)


def decode_heights(data, count):
    """The inverse of encode_heights. The game has its own copy in lib/play/world/terrain.js."""
    out = np.empty(count, np.float32)
    i = k = prev = 0
    while k < count:
        b = data[i]
        if b == 0:
            run = data[i + 1] | data[i + 2] << 8
            out[k:k + run] = prev / 100 - HEIGHT_ZERO
            k += run
            i += 3
            continue
        if b == 255:
            prev = data[i + 1] | data[i + 2] << 8
            i += 3
        else:
            prev += b - 128
            i += 1
        out[k] = prev / 100 - HEIGHT_ZERO
        k += 1
    return out


def cell_heights(t, bounds, step):
    x0, y0, x1, y1 = bounds
    nx, ny = int(round((x1 - x0) / step)) + 1, int(round((y1 - y0) / step)) + 1
    xs, ys = np.linspace(x0, x1, nx), np.linspace(y0, y1, ny)
    arr = sample(t, "walk", xs, ys)
    data = encode_heights(arr)
    back = decode_heights(data, nx * ny).reshape(ny, nx)
    if np.abs(back - arr).max() > 0.011:
        raise RuntimeError(f"height encoding is off by {np.abs(back - arr).max():.3f} m")
    return data, {"nx": nx, "ny": ny, "x0": x0, "y0": y0, "dx": (x1 - x0) / (nx - 1), "dy": (y1 - y0) / (ny - 1)}


def paved(w, h, seed=7):
    """Today's plain city ground, matching the paved surround of the baked garden."""
    rng = np.random.default_rng(seed)
    noise = np.asarray(Image.fromarray((rng.random((h, w)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
    rgb = np.array([0.40, 0.40, 0.39])[None, None, :] + (noise - noise.mean())[..., None] * 0.5
    return Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))


def paint_today(bounds, w, h, today):
    x0, y0, x1, y1 = bounds
    im = paved(w, h)
    d = ImageDraw.Draw(im)
    sx, sy = w / (x1 - x0), h / (y1 - y0)
    px = lambda p: ((p[0] - x0) * sx, (y1 - p[1]) * sy)
    for road in today.get("roads", []):
        pts = [px(p) for p in road["points"]]
        wd = max(2, int(road["width"] * sx))
        d.line(pts, fill=tuple(road.get("color", (62, 62, 64))), width=wd, joint="curve")
        d.line(pts, fill=(150, 148, 140), width=max(1, int(0.3 * sx)))
    return im


def make_blocks(cfg):
    """Plain city blocks, kept off the garden, the surviving gate and the streets."""
    spec = cfg["today"]["blocks"]
    rng = random.Random(spec.get("seed", 7))
    cx, cy = spec["center"]
    clear = spec.get("clear", [])
    roads = cfg["today"].get("roads", [])

    def near_road(x, y, r):
        for road in roads:
            pts = road["points"]
            for a, b in zip(pts[:-1], pts[1:]):
                ax, ay, bx, by = a[0], a[1], b[0], b[1]
                L = max((bx - ax) ** 2 + (by - ay) ** 2, 1e-6)
                t = max(0, min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / L))
                if math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))) < r + road["width"] / 2:
                    return True
        return False

    items, tries = [], 0
    while len(items) < spec["count"] and tries < spec["count"] * 40:
        tries += 1
        a = rng.random() * math.tau
        r = spec["inner"] + (spec["outer"] - spec["inner"]) * math.sqrt(rng.random())
        x, y = cx + math.cos(a) * r * spec.get("stretch", [1, 1])[0], cy + math.sin(a) * r * spec.get("stretch", [1, 1])[1]
        w, d = 10 + rng.random() * 20, 10 + rng.random() * 20
        reach = math.hypot(w, d) / 2 + 2
        if any(q[0] - reach < x < q[2] + reach and q[1] - reach < y < q[3] + reach for q in clear) or near_road(x, y, reach):
            continue
        if any(math.hypot(x - o[0], y - o[1]) < reach + math.hypot(o[2], o[3]) / 2 + 2 for o in items):
            continue
        h = 7 + rng.random() * rng.random() * 40
        items.append([round(x, 1), round(y, 1), round(w, 1), round(d, 1), round(h, 1), round(rng.random() * math.pi, 3)])
    return items


def composite(cfg, era, width):
    """The whole map from the cells' own baked grounds. Today's cells are the ones painted at publish."""
    b = cfg["terrain"]["bounds"]
    w = width
    h = int(round(width * (b[3] - b[1]) / (b[2] - b[0]))) // 4 * 4
    # Past the baked cells: plain earth in the past, plain city today.
    earth = np.asarray(paved(w, h, seed=3), np.float32) / 0.40 * np.array([0.66, 0.50, 0.39])
    canvas = paved(w, h) if era == "now" else Image.fromarray(np.clip(earth, 0, 255).astype(np.uint8))
    if era == "now":
        canvas = paint_today(b, w, h, cfg["today"])
    sx, sy = w / (b[2] - b[0]), h / (b[3] - b[1])
    for cid, cell in cfg["cells"].items():
        if era == "now" and "now" not in cell["ground"].get("states", []):
            continue
        f = OUT / cid / "tex" / f"ground_{era}.png"
        if not f.exists():
            raise RuntimeError(f"no {f}")
        c = cell["bounds"]
        # One pixel over, so two cells never leave a seam of background between them.
        size = (max(1, int(round((c[2] - c[0]) * sx)) + 1), max(1, int(round((c[3] - c[1]) * sy)) + 1))
        canvas.paste(Image.open(f).convert("RGB").resize(size, Image.LANCZOS), (int(round((c[0] - b[0]) * sx)), int(round((b[3] - c[3]) * sy))))
    return canvas


def map_tone(image):
    """For the minimap only: deep shade under walls and buildings lifts to a dark warm brown, so a
    building reads as a shape on the map and not as a black hole."""
    a = np.asarray(image, np.float32) / 255
    lum = a.mean(axis=2, keepdims=True)
    lift = np.clip((0.30 - lum) / 0.30, 0, 1)
    out = a * (1 - lift) + (a * 0.5 + np.array([0.27, 0.19, 0.15])) * lift
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


def mark_today(image, cfg, blocks):
    """Today's minimap: the city blocks and the surviving landmarks, drawn over the streets."""
    b = cfg["terrain"]["bounds"]
    w, h = image.size
    sx, sy = w / (b[2] - b[0]), h / (b[3] - b[1])
    px = lambda x, y: ((x - b[0]) * sx, (b[3] - y) * sy)
    d = ImageDraw.Draw(image)
    for x, y, bw, bd, _h, yaw in blocks:
        # A scene rotation by yaw about up is the same rotation by yaw in plan, where y is minus z.
        c, n = math.cos(yaw), math.sin(yaw)
        corners = [(sa * bw / 2, sb * bd / 2) for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        d.polygon([px(x + u * c - v * n, y + u * n + v * c) for u, v in corners], fill=(126, 130, 136))
    for mark in cfg["today"].get("map_marks", []):
        d.polygon([px(*q) for q in mark["points"]], fill=tuple(mark["color"]))
    return image


def write_base(cfg, t):
    """A coarse ground for the whole map, so nothing beyond the loaded cells is ever empty."""
    out = OUT / "base"
    (out / "tex").mkdir(parents=True, exist_ok=True)
    b = cfg["terrain"]["bounds"]
    step = float(cfg["terrain"].get("base_grid", 10))
    nx, ny = int(round((b[2] - b[0]) / step)) + 1, int(round((b[3] - b[1]) / step)) + 1
    xs, ys = np.linspace(b[0], b[2], nx), np.linspace(b[1], b[3], ny)
    z = sample(t, "h", xs, ys) - 0.12
    X, Y = np.meshgrid(xs, ys)
    pos = np.column_stack((X.ravel(), Y.ravel(), z.ravel())).astype(np.float32)
    uv = np.column_stack(((X.ravel() - b[0]) / (b[2] - b[0]), (Y.ravel() - b[1]) / (b[3] - b[1]))).astype(np.float32)
    idx = []
    for j in range(ny - 1):
        for i in range(nx - 1):
            p = j * nx + i
            idx += [p, p + 1, p + nx + 1, p, p + nx + 1, p + nx]
    idx = np.array(idx, np.uint32)
    with open(out / "ground.bin", "wb") as f:
        f.write(pos.tobytes())
        f.write(uv.tobytes())
        f.write(np.zeros(len(pos), np.uint8).tobytes())
        f.write(idx.tobytes())
    meta = {"vertices": len(pos), "indices": len(idx), "tris": len(idx) // 3, "min": pos.min(0).round(3).tolist(), "max": pos.max(0).round(3).tolist()}
    (out / "ground.json").write_text(json.dumps(meta))
    px = int(cfg["terrain"].get("base_px", 1024))
    composite(cfg, "then", px).save(out / "tex" / "ground_then.png")
    composite(cfg, "now", px).save(out / "tex" / "ground_now.png")
    return meta
