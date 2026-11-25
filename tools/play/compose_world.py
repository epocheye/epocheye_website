"""Turn baked albedo and light into display-ready atlases.

  python tools/play/compose_world.py <cell-dir> [--exposure X]

Albedo stays sharp. Light is cleaned one UV chart at a time, so a chart never picks up its neighbour
across a gutter, and the gutters are then filled from the nearest chart so mipmaps stay clean. The
two are multiplied and tone mapped once here through the scene's own view (view_lut.npz, which
world_build.py samples from Blender's OpenColorIO config), so every device shows the same picture
from a cheap unlit shader.
Writes <cell-dir>/tex/<group>_<state>.png and <cell-dir>/compose.json.
"""
import argparse, json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

# The contrast each AgX Look applies in log space, from Blender's own config.ocio. Saturation for
# these three is 1 or very close, so contrast is what carries them.
LOOK_CONTRAST = {"AgX - Medium High Contrast": 1.2, "AgX - High Contrast": 1.4, "AgX - Very High Contrast": 1.57}
LOOK_PIVOT = 0.4  # OCIO log-style pivot of -0.2, as a code value


def agx(x, contrast=1.0):
    """AgX display transform (Wrensch's fit) with the Look's log contrast, so the atlases match the
    scene's own view. Returns display-encoded values."""
    m = np.array([[0.842479062253094, 0.0423282422610123, 0.0423756549057051],
                  [0.0784335999999992, 0.87846864216, 0.0784336],
                  [0.0792237451477643, 0.0791661274605434, 0.879142973793104]])
    inv = np.array([[1.19687900512017, -0.0528968517574562, -0.0529716355144438],
                    [-0.0980208811401368, 1.15190312990417, -0.0980434501171241],
                    [-0.0990297440797205, -0.0989611768448433, 1.15107367264116]])
    v = np.maximum(x @ m, 1e-10)
    lo, hi = -12.47393, 4.026069
    v = np.clip((np.log2(v) - lo) / (hi - lo), 0, 1)
    if contrast != 1.0:
        v = np.clip((v - LOOK_PIVOT) * contrast + LOOK_PIVOT, 0, 1)
    v2 = v * v
    v4 = v2 * v2
    v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + 0.4298 * v2 + 0.1191 * v - 0.00232
    return np.clip(v @ inv, 0, 1)


def load_view_lut(cell):
    """The scene's display transform as baked by world_build.py: this cell's, else the last one any
    bake wrote (every cell renders from the same scene). None if no bake has written one yet."""
    for path in (cell / "view_lut.npz", cell.parent / "view_lut.npz"):
        if path.exists():
            with np.load(path) as d:
                return {"table": d["table"].astype(np.float32), "lo": float(d["lo"]), "hi": float(d["hi"]),
                        "name": f"{d['view']} / {d['look'] or 'no look'} / {d['display']}", "path": str(path)}
    return None


def apply_lut(x, lut, chunk=1 << 21):
    """Scene-linear RGB (already exposed) to display values through the 3D table, trilinear in log2."""
    table, lo, hi = lut["table"], lut["lo"], lut["hi"]
    n = table.shape[0]
    flat = x.reshape(-1, 3)
    out = np.empty_like(flat, dtype=np.float32)
    for at in range(0, len(flat), chunk):
        part = np.log2(np.maximum(flat[at:at + chunk], 2.0 ** lo))
        coords = np.clip((part - lo) / (hi - lo) * (n - 1), 0, n - 1).T
        for c in range(3):
            out[at:at + chunk, c] = ndimage.map_coordinates(table[..., c], coords, order=1, mode="nearest")
    return np.clip(out.reshape(x.shape), 0, 1)


def chart_mask(cell, group, size):
    """Which texels each UV chart covers, drawn from the group's geometry. Rows run top down, as the
    composed atlas does. Returns a label image, or None if the geometry is not there."""
    meta_path, bin_path = cell / f"{group}.json", cell / f"{group}.bin"
    if not meta_path.exists() or not bin_path.exists():
        return None
    meta = json.loads(meta_path.read_text())
    raw = bin_path.read_bytes()
    n, ni = meta["vertices"], meta["indices"]
    uv = np.frombuffer(raw, np.float32, n * 2, n * 12).reshape(-1, 2)
    idx = np.frombuffer(raw, np.uint32, ni, n * 21).reshape(-1, 3)
    px = np.column_stack((uv[:, 0] * size, (1 - uv[:, 1]) * size))
    img = Image.new("1", (size, size), 0)
    draw = ImageDraw.Draw(img)
    for tri in px[idx].tolist():
        draw.polygon([tuple(p) for p in tri], fill=1, outline=1)
    labels, count = ndimage.label(np.asarray(img, bool), structure=np.ones((3, 3), bool))
    return labels, count


def fill_gutters(image, covered):
    """Every texel outside a chart takes the colour of the nearest texel inside one."""
    if covered.all() or not covered.any():
        return image
    near = ndimage.distance_transform_edt(~covered, return_distances=False, return_indices=True)
    return image[near[0], near[1]]


def clean_light(light, labels, count, sigma):
    """Remove fireflies and sampling noise inside each chart, without blurring across its edges."""
    out = light.copy()
    boxes = ndimage.find_objects(labels)
    for k, box in enumerate(boxes, 1):
        if box is None:
            continue
        y, x = box
        pad = (slice(max(y.start - 3, 0), y.stop + 3), slice(max(x.start - 3, 0), x.stop + 3))
        inside = labels[pad] == k
        area = int(inside.sum())
        if area < 4:
            continue
        patch = light[pad]
        if area >= 25:
            # A firefly is far above its neighbours. Shade with sparse samples is not, so this keeps it.
            med = np.stack([ndimage.median_filter(patch[:, :, c], size=5, mode="nearest") for c in range(3)], axis=2)
            patch = np.where(inside[..., None], np.minimum(patch, med * 6 + 0.05), patch)
        weight = ndimage.gaussian_filter(inside.astype(np.float32), sigma, mode="constant")
        smooth = ndimage.gaussian_filter(patch * inside[..., None], (sigma, sigma, 0), mode="constant")
        smooth = smooth / np.maximum(weight[..., None], 1e-4)
        out[pad] = np.where(inside[..., None], smooth, out[pad])
    return out


def lit(cell, albedo_path):
    name = albedo_path.name.replace("_albedo.npy", "")
    group = name.rsplit("_", 1)[0]
    a = np.load(albedo_path)[::-1, :, :3].astype(np.float32)
    l = np.load(str(albedo_path).replace("_albedo", "_light"))[::-1, :, :3].astype(np.float32)
    l = np.nan_to_num(l, posinf=0, neginf=0)
    charts = chart_mask(cell, group, l.shape[0])
    if charts is not None:
        labels, count = charts
        l = clean_light(l, labels, count, sigma=0.9)
        l = fill_gutters(l, labels > 0)
    else:
        l = ndimage.gaussian_filter(l, sigma=(1.0, 1.0, 0))
    f = a.shape[0] / l.shape[0]
    if f != 1:
        l = ndimage.zoom(l, (f, f, 1), order=1)
    l = l[: a.shape[0], : a.shape[1]]
    full = chart_mask(cell, group, a.shape[0])
    if full is not None:
        a = fill_gutters(a, full[0] > 0)
    return np.clip(a, 0, 1), l


def finish_card(path):
    """Tree cards are cut out at alpha 0.5 in the game. Colour under the transparent part is black,
    which mipmaps pull into the leaf edges, and thin leaves vanish as the card shrinks. So the leaf
    colour is spread outward and the edge of the coverage is thickened a little."""
    rgba = np.asarray(Image.open(path).convert("RGBA"), np.float32) / 255
    rgb, alpha = rgba[:, :, :3], rgba[:, :, 3]
    solid = alpha > 0.5
    if not solid.any():
        raise SystemExit(f"Empty tree card: {path}")
    rgb = fill_gutters(rgb, solid)
    thick = np.maximum(alpha, np.clip(ndimage.gaussian_filter(alpha, 1.0) * 1.5, 0, 1))
    out = np.dstack((rgb, thick))
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(path, optimize=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cell")
    ap.add_argument("--cards", action="store_true", help="the folder holds tree cards: finish them and stop")
    ap.add_argument("--exposure", type=float)
    ap.add_argument("--fill", type=float, default=0.0, help="sky fill in deep shade, as a share of the median light")
    ap.add_argument("--fill-groups", default="", help="comma list of atlases that get the fill; empty means all")
    ap.add_argument("--only", default="", help="comma list of atlases to compose; empty means all")
    ap.add_argument("--fit", action="store_true", help="tone map with the old AgX fit, not the scene's own table")
    args = ap.parse_args()
    fill_only = {x for x in args.fill_groups.split(",") if x}
    only = {x for x in args.only.split(",") if x}
    wants_fill = lambda atlas: args.fill > 0 and (not fill_only or atlas.rsplit("_", 1)[0] in fill_only)
    cell = Path(args.cell)
    if args.cards:
        for card in sorted(cell.glob("*_front.png")) + sorted(cell.glob("*_side.png")):
            finish_card(card)
            print("card", card.name, flush=True)
        return
    files = sorted(cell.glob("*_albedo.npy"))
    beauty = sorted(cell.glob("*_beauty.npy"))
    if only:
        files = [f for f in files if f.name.replace("_albedo.npy", "") in only]
        beauty = [f for f in beauty if f.name.replace("_beauty.npy", "") in only]
    if not files and not beauty:
        raise SystemExit(f"No bakes in {cell}")
    meta = json.loads((cell / "meta.json").read_text())
    exposure = args.exposure if args.exposure is not None else meta["exposure"]
    # A bake from before the Look was recorded keeps the plain view it was composed with.
    contrast = LOOK_CONTRAST.get(meta.get("look"), 1.0)
    lut = None if args.fit else load_view_lut(cell)
    tone = (lambda x: apply_lut(x, lut)) if lut else (lambda x: agx(x, contrast))
    print("tone:", lut["name"] + " from " + lut["path"] if lut else f"AgX fit, contrast {contrast}", flush=True)
    (cell / "tex").mkdir(exist_ok=True)
    report_path = cell / "compose.json"
    report = json.loads(report_path.read_text()) if only and report_path.exists() else {"atlases": {}}
    report.update({"exposure": round(exposure, 5), "look": meta.get("look"), "contrast": contrast,
                   "tone": lut["name"] if lut else "agx fit"})
    for f in files:
        name = f.name.replace("_albedo.npy", "")
        a, l = lit(cell, f)
        if wants_fill(name):
            # Passages and deep shade keep some sky light, so they read as places and not as black.
            l = l + args.fill * float(np.median(l[l.mean(axis=2) > 1e-4]))
        rgb = tone(a * l * exposure)
        Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(cell / "tex" / f"{name}.png", optimize=False)
        report["atlases"][name] = {"px": a.shape[0], "mean": round(float(rgb.mean()), 3)}
        print(name, report["atlases"][name], flush=True)
    for f in beauty:
        name = f.name.replace("_beauty.npy", "")
        raw = np.nan_to_num(np.load(f)[::-1], posinf=0, neginf=0)
        x, alpha = raw[:, :, :3], np.clip(raw[:, :, 3:], 0, 1)
        x = x / np.maximum(alpha, 1e-3)
        # Single bright pixels (fireflies, and edges divided by a tiny alpha) read as white specks at a distance.
        x = np.minimum(x, ndimage.median_filter(x, size=(5, 5, 1)) * 1.8 + 1e-3)
        if wants_fill(name):
            x = x + args.fill * np.median(x[alpha[:, :, 0] > 0.5], axis=0)
        rgb = tone(x * exposure)
        if name.endswith("_then"):
            # Pin holes in the period ground take the colour of the nearest solid ground, not today's paving.
            solid = alpha[:, :, 0] >= 0.98
            if solid.any() and not solid.all():
                near = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
                rgb = rgb[near[0], near[1]]
                alpha = np.ones_like(alpha)
        # Beyond the modelled ground: today's paved city, plain and low in contrast.
        rng = np.random.default_rng(7)
        grain = ndimage.gaussian_filter(rng.random(alpha.shape[:2]), 3)[..., None]
        paved = np.array([0.40, 0.40, 0.39]) + (grain - grain.mean()) * 0.5
        rgb = rgb * alpha + paved * (1 - alpha)
        Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(cell / "tex" / f"{name}.png", optimize=False)
        report["atlases"][name] = {"px": x.shape[0], "mean": round(float(rgb.mean()), 3)}
        print(name, report["atlases"][name], flush=True)
    report_path.write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
