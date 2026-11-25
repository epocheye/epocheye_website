"""Look at a baked cell without a browser or a GPU: a small software renderer over the same files.

  python tools/play/preview_bake.py <out.jpg> --cell tools/play/out/world/court --groups palace:now,ground:then \
      --eye 0,-14,1.6 --at 0,0,3 [--fov 75] [--size 1280x720] [--grade then|now|none] [--channel beauty|light|albedo]

Blender coordinates, Z up. --grade applies the game's own colour grade from lib/play/world/bakedMaterial.js,
so a picture here is what the game's shader does to the atlas, before fog.
"""
import argparse, json
from pathlib import Path

import numpy as np
from PIL import Image


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def grade_then(c):
    lum = [0.2126, 0.7152, 0.0722]
    l = (c * lum).sum(-1, keepdims=True)
    warm = c * [1.10, 0.99, 0.84]
    shade = c * [0.97, 0.98, 1.03] + [0.010, 0.009, 0.010]
    t = smoothstep(0.04, 0.45, l)
    c = shade * (1 - t) + warm * t
    l2 = (c * lum).sum(-1, keepdims=True)
    return l2 + (c - l2) * 1.05


def grade_now(c):
    l = (c * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    return (l + (c - l) * 0.97) * [0.99, 1.0, 1.015]


def load_group(cell, name):
    meta = json.loads((cell / f"{name}.json").read_text())
    raw = (cell / f"{name}.bin").read_bytes()
    n, ni = meta["vertices"], meta["indices"]
    pos = np.frombuffer(raw, np.float32, n * 3, 0).reshape(-1, 3).astype(np.float64)
    uv = np.frombuffer(raw, np.float32, n * 2, n * 12).reshape(-1, 2).astype(np.float64)
    idx = np.frombuffer(raw, np.uint32, ni, n * 21).reshape(-1, 3)
    return pos, uv, idx


def texture(cell, name, state, channel):
    if channel == "beauty":
        return np.asarray(Image.open(cell / "tex" / f"{name}_{state}.png").convert("RGB"), np.float32) / 255
    t = np.load(cell / f"{name}_{state}_{channel}.npy")[::-1, :, :3]
    if channel == "light":
        t = np.clip(t / max(np.percentile(t, 99), 1e-3), 0, 1) ** (1 / 2.2)
    else:
        t = linear_to_srgb(np.clip(t, 0, 1))
    return t.astype(np.float32)


def render(items, eye, at, fov, w, h):
    eye, at = np.array(eye, float), np.array(at, float)
    f = at - eye; f /= np.linalg.norm(f)
    r = np.cross(f, [0, 0, 1]); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    fx = (w / 2) / np.tan(np.radians(fov) / 2)
    img = np.zeros((h, w, 3), np.float32)
    img[:] = (0.55, 0.62, 0.72)
    depth = np.full((h, w), np.inf, np.float64)
    near = 0.1
    for pos, uv, idx, tex in items:
        tv, tu = tex.shape[0], tex.shape[1]
        d = pos - eye
        X, Y, Z = d @ r, d @ u, d @ f
        tris = idx[(Z[idx] > near).all(axis=1)]
        sx = w / 2 + fx * X / np.maximum(Z, near)
        sy = h / 2 - fx * Y / np.maximum(Z, near)
        x0 = np.floor(sx[tris].min(1)).astype(int).clip(0, w)
        x1 = np.ceil(sx[tris].max(1)).astype(int).clip(0, w)
        y0 = np.floor(sy[tris].min(1)).astype(int).clip(0, h)
        y1 = np.ceil(sy[tris].max(1)).astype(int).clip(0, h)
        keep = (x1 > x0) & (y1 > y0)
        for t, a, b, c, e in zip(tris[keep], x0[keep], x1[keep], y0[keep], y1[keep]):
            px, py = np.meshgrid(np.arange(a, b) + 0.5, np.arange(c, e) + 0.5)
            ax, ay, bx, by, cx, cy = sx[t[0]], sy[t[0]], sx[t[1]], sy[t[1]], sx[t[2]], sy[t[2]]
            den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(den) < 1e-9:
                continue
            l0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den
            l1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den
            l2 = 1 - l0 - l1
            m = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
            if not m.any():
                continue
            iz = l0[m] / Z[t[0]] + l1[m] / Z[t[1]] + l2[m] / Z[t[2]]
            z = 1 / iz
            ii, jj = (py[m] - 0.5).astype(int), (px[m] - 0.5).astype(int)
            near_ok = z < depth[ii, jj]
            if not near_ok.any():
                continue
            uu = (l0[m] * uv[t[0], 0] / Z[t[0]] + l1[m] * uv[t[1], 0] / Z[t[1]] + l2[m] * uv[t[2], 0] / Z[t[2]]) * z
            vv = (l0[m] * uv[t[0], 1] / Z[t[0]] + l1[m] * uv[t[1], 1] / Z[t[1]] + l2[m] * uv[t[2], 1] / Z[t[2]]) * z
            sx_t = np.clip(uu * tu - 0.5, 0, tu - 1.001)
            sy_t = np.clip((1 - vv) * tv - 0.5, 0, tv - 1.001)
            i0, j0 = sx_t.astype(int), sy_t.astype(int)
            fu, fv = (sx_t - i0)[..., None], (sy_t - j0)[..., None]
            col = (tex[j0, i0] * (1 - fu) + tex[j0, i0 + 1] * fu) * (1 - fv) + (tex[j0 + 1, i0] * (1 - fu) + tex[j0 + 1, i0 + 1] * fu) * fv
            depth[ii[near_ok], jj[near_ok]] = z[near_ok]
            img[ii[near_ok], jj[near_ok]] = col[near_ok]
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--cell", required=True)
    ap.add_argument("--groups", required=True, help="group:state,...")
    ap.add_argument("--eye", required=True)
    ap.add_argument("--at", required=True)
    ap.add_argument("--fov", type=float, default=75)
    ap.add_argument("--size", default="1280x720")
    ap.add_argument("--grade", default="none", choices=["then", "now", "none"])
    ap.add_argument("--channel", default="beauty", choices=["beauty", "light", "albedo"])
    args = ap.parse_args()
    cell = Path(args.cell)
    items = []
    for spec in args.groups.split(","):
        name, state = spec.split(":")
        pos, uv, idx = load_group(cell, name)
        channel = "beauty" if name == "ground" else args.channel
        items.append((pos, uv, idx, texture(cell, name, state, channel)))
    w, h = (int(x) for x in args.size.split("x"))
    img = render(items, [float(x) for x in args.eye.split(",")], [float(x) for x in args.at.split(",")], args.fov, w, h)
    if args.grade != "none":
        lin = srgb_to_linear(img)
        lin = grade_then(lin) if args.grade == "then" else grade_now(lin)
        img = linear_to_srgb(lin)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(args.out, quality=90)
    print(args.out)


if __name__ == "__main__":
    main()
