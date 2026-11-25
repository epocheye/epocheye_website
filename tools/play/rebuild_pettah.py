"""Rebuilds the distant pettah houses as clean massing, with no Blender and no new bake.

Blender's Decimate tore the houses into loose triangles. This keeps what the bake knows: each
house's place and size (the plan's bounding boxes and the baked vertices) and its baked colour
(each new face samples the old atlas where a triangle faced the same way). Each house becomes
four walls and a pitched roof along its long side. The pettah stays INFERRED, distant massing.

  python tools/play/rebuild_pettah.py
  node tools/play/pack_world.mjs gate --out <folder> --groups pettah --textures pettah_then --no-cards

Then copy <folder>/gate/pettah.glb into the live version. A rebake of the gate cell overwrites
pettah.bin, so run this again after one. The torn original is kept as pettah.torn.bin.
"""
import json
import os
import shutil

import numpy as np

CELL = os.path.join("tools", "play", "out", "world", "gate")
PLAN = os.path.join("tools", "play", "out", "world", "plan", "objects.json")
CLIP = (336, -130, 640, 280)  # the pettah group's clip_bounds in the world config
EAVE = 0.68  # share of a house's height at which the walls stop and the roof starts


def load():
    src = os.path.join(CELL, "pettah.torn.bin")
    if not os.path.exists(src):
        shutil.copyfile(os.path.join(CELL, "pettah.bin"), src)
        shutil.copyfile(os.path.join(CELL, "pettah.json"), os.path.join(CELL, "pettah.torn.json"))
    meta = json.load(open(os.path.join(CELL, "pettah.torn.json")))
    n = meta["vertices"]
    raw = open(src, "rb").read()
    pos = np.frombuffer(raw, np.float32, n * 3, 0).reshape(-1, 3)
    uv = np.frombuffer(raw, np.float32, n * 2, n * 12).reshape(-1, 2)
    tri = np.frombuffer(raw, np.uint32, meta["indices"], n * 21).reshape(-1, 3)
    return pos, uv, tri


def group_boxes(boxes):
    """The parts of one house (walls, roof) share a centre. Neighbours do not."""
    centre = (boxes[:, :2] + boxes[:, 2:]) / 2
    size = boxes[:, 2:] - boxes[:, :2]
    parent = list(range(len(boxes)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(boxes)):
        gap = np.hypot(*(centre[i + 1:] - centre[i]).T)
        near = 0.3 * np.minimum(size[i + 1:].min(axis=1), size[i].min())
        for j in np.nonzero(gap < near)[0]:
            parent[find(i + 1 + int(j))] = find(i)
    roots = np.array([find(i) for i in range(len(boxes))])
    return [boxes[roots == r] for r in np.unique(roots)]


def hull(points):
    pts = sorted(set(map(tuple, points.round(3).tolist())))
    if len(pts) < 3:
        return np.array(pts)

    def half(seq):
        out = []
        for p in seq:
            while len(out) > 1 and (out[-1][0] - out[-2][0]) * (p[1] - out[-2][1]) - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0]) <= 0:
                out.pop()
            out.append(p)
        return out[:-1]

    return np.array(half(pts) + half(pts[::-1]))


def min_rect(points):
    """Centre, unit long axis, and half sizes of the smallest rectangle round the points."""
    h = hull(points)
    best = None
    for k in range(len(h)):
        e = h[(k + 1) % len(h)] - h[k]
        length = np.hypot(*e)
        if length < 1e-4:
            continue
        ax = e / length
        ay = np.array([-ax[1], ax[0]])
        a, b = h @ ax, h @ ay
        area = np.ptp(a) * np.ptp(b)
        if best is None or area < best[0]:
            mid = ax * (a.max() + a.min()) / 2 + ay * (b.max() + b.min()) / 2
            best = (area, mid, ax, ay, np.ptp(a) / 2, np.ptp(b) / 2)
    if best is None:
        return None
    _, mid, ax, ay, ha, hb = best
    return (mid, ax, ay, ha, hb) if ha >= hb else (mid, ay, -ax, hb, ha)


def main():
    pos, uv, tri = load()
    boxes = np.array(json.load(open(PLAN))["houses"], np.float64)
    mid = (boxes[:, :2] + boxes[:, 2:]) / 2
    boxes = boxes[(mid[:, 0] > CLIP[0]) & (mid[:, 0] < CLIP[2]) & (mid[:, 1] > CLIP[1]) & (mid[:, 1] < CLIP[3])]
    houses = group_boxes(boxes)

    corners = pos[tri]
    centre = corners.mean(axis=1)
    normal = np.cross(corners[:, 1] - corners[:, 0], corners[:, 2] - corners[:, 0])
    area = np.linalg.norm(normal, axis=1)
    normal = normal / (area[:, None] + 1e-9)
    tuv = uv[tri].mean(axis=1)

    # Each triangle belongs to the nearest house whose box holds its centre.
    spans = np.array([[h[:, 0].min(), h[:, 1].min(), h[:, 2].max(), h[:, 3].max()] for h in houses])
    mids = (spans[:, :2] + spans[:, 2:]) / 2
    owner = np.full(len(tri), -1)
    best = np.full(len(tri), np.inf)
    for k, s in enumerate(spans):
        inside = (centre[:, 0] >= s[0] - 0.2) & (centre[:, 0] <= s[2] + 0.2) & (centre[:, 1] >= s[1] - 0.2) & (centre[:, 1] <= s[3] + 0.2)
        d = np.hypot(centre[:, 0] - mids[k, 0], centre[:, 1] - mids[k, 1])
        take = inside & (d < best)
        owner[take], best[take] = k, d[take]

    V, U, F = [], [], []

    def face(points, want, mine):
        score = (normal[mine] @ want) * np.sqrt(area[mine])
        at = tuv[mine[int(np.argmax(score))]]
        base = len(V)
        V.extend(points)
        U.extend([at] * len(points))
        F.extend([base, base + i, base + i + 1] for i in range(1, len(points) - 1))

    made = 0
    for k in range(len(houses)):
        mine = np.nonzero(owner == k)[0]
        if not len(mine):
            continue
        pts = corners[mine].reshape(-1, 3)
        rect = min_rect(pts[:, :2])
        if rect is None:
            continue
        c, ax, ay, ha, hb = rect
        if hb < 0.3:
            continue
        z0, z1 = float(pts[:, 2].min()), float(pts[:, 2].max())
        ze = z0 + (z1 - z0) * EAVE
        at = lambda a, b, z: np.array([*(c + ax * a * ha + ay * b * hb), z])
        a, b, cc, d = at(-1, -1, z0), at(1, -1, z0), at(1, 1, z0), at(-1, 1, z0)
        ae, be, ce, de = at(-1, -1, ze), at(1, -1, ze), at(1, 1, ze), at(-1, 1, ze)
        r0, r1 = at(-1, 0, z1), at(1, 0, z1)
        ux, uy = np.array([*ax, 0.0]), np.array([*ay, 0.0])
        up = np.array([0.0, 0.0, 1.0])
        face([a, b, be, ae], -uy, mine)
        face([b, cc, ce, be], ux, mine)
        face([cc, d, de, ce], uy, mine)
        face([d, a, ae, de], -ux, mine)
        face([be, r1, r0, ae], (up - uy) / np.sqrt(2), mine)
        face([de, r0, r1, ce], (up + uy) / np.sqrt(2), mine)
        face([ae, r0, de], -ux, mine)
        face([ce, r1, be], ux, mine)
        made += 1

    V = np.array(V, np.float32)
    U = np.array(U, np.float32)
    F = np.array(F, np.uint32)
    cls = np.zeros(len(V), np.uint8)
    with open(os.path.join(CELL, "pettah.bin"), "wb") as out:
        out.write(V.tobytes())
        out.write(U.tobytes())
        out.write(cls.tobytes())
        out.write(F.ravel().tobytes())
    meta = {"vertices": len(V), "indices": int(F.size), "tris": len(F), "min": V.min(axis=0).tolist(), "max": V.max(axis=0).tolist()}
    json.dump(meta, open(os.path.join(CELL, "pettah.json"), "w"))
    print(json.dumps({"parts": len(boxes), "houses": made, **meta}))


if __name__ == "__main__":
    main()
