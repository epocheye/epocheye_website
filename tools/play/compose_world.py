"""Turn baked albedo and light into display-ready atlases.

  python tools/play/compose_world.py <cell-dir> [--exposure X]

Light is noisy and low frequency, so it is smoothed and scaled up; albedo stays sharp. The two are
multiplied and tone mapped once here, so every device shows the same picture from a cheap unlit shader.
Writes <cell-dir>/tex/<group>_<state>.png and <cell-dir>/compose.json.
"""
import argparse, json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def agx(x):
    """AgX display transform (Wrensch's fit), so the atlases match the scene's own AgX view.
    Returns display-encoded values."""
    m = np.array([[0.842479062253094, 0.0423282422610123, 0.0423756549057051],
                  [0.0784335999999992, 0.87846864216, 0.0784336],
                  [0.0792237451477643, 0.0791661274605434, 0.879142973793104]])
    inv = np.array([[1.19687900512017, -0.0528968517574562, -0.0529716355144438],
                    [-0.0980208811401368, 1.15190312990417, -0.0980434501171241],
                    [-0.0990297440797205, -0.0989611768448433, 1.15107367264116]])
    v = np.maximum(x @ m, 1e-10)
    lo, hi = -12.47393, 4.026069
    v = np.clip((np.log2(v) - lo) / (hi - lo), 0, 1)
    v2 = v * v
    v4 = v2 * v2
    v = 15.5 * v4 * v2 - 40.14 * v4 * v + 31.96 * v4 - 6.868 * v2 * v + 0.4298 * v2 + 0.1191 * v - 0.00232
    return np.clip(v @ inv, 0, 1)


def lit(albedo_path):
    a = np.load(albedo_path)[::-1, :, :3]
    l = np.load(str(albedo_path).replace("_albedo", "_light"))[::-1, :, :3]
    l = np.nan_to_num(l, posinf=0, neginf=0)
    # Clamp fireflies against the local neighbourhood, then smooth.
    med = ndimage.median_filter(l, size=(3, 3, 1))
    l = np.minimum(l, med * 3 + 1e-3)
    l = ndimage.gaussian_filter(l, sigma=(1.0, 1.0, 0))
    f = a.shape[0] / l.shape[0]
    if f != 1:
        l = ndimage.zoom(l, (f, f, 1), order=1)
    return np.clip(a, 0, 1), l[: a.shape[0], : a.shape[1]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cell")
    ap.add_argument("--exposure", type=float)
    args = ap.parse_args()
    cell = Path(args.cell)
    files = sorted(cell.glob("*_albedo.npy"))
    beauty = sorted(cell.glob("*_beauty.npy"))
    if not files and not beauty:
        raise SystemExit(f"No bakes in {cell}")
    exposure = args.exposure
    if exposure is None:
        exposure = json.loads((cell / "meta.json").read_text())["exposure"]
    (cell / "tex").mkdir(exist_ok=True)
    report = {"exposure": round(exposure, 5), "atlases": {}}
    for f in files:
        name = f.name.replace("_albedo.npy", "")
        a, l = lit(f)
        rgb = agx(a * l * exposure)
        Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(cell / "tex" / f"{name}.png", optimize=False)
        report["atlases"][name] = {"px": a.shape[0], "mean": round(float(rgb.mean()), 3)}
        print(name, report["atlases"][name], flush=True)
    for f in beauty:
        name = f.name.replace("_beauty.npy", "")
        raw = np.nan_to_num(np.load(f)[::-1], posinf=0, neginf=0)
        x, alpha = raw[:, :, :3], np.clip(raw[:, :, 3:], 0, 1)
        rgb = agx(x / np.maximum(alpha, 1e-3) * exposure)
        # Beyond the modelled ground: today's paved city, plain and low in contrast.
        rng = np.random.default_rng(7)
        grain = ndimage.gaussian_filter(rng.random(alpha.shape[:2]), 3)[..., None]
        paved = np.array([0.40, 0.40, 0.39]) + (grain - grain.mean()) * 0.5
        rgb = rgb * alpha + paved * (1 - alpha)
        Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).save(cell / "tex" / f"{name}.png", optimize=False)
        report["atlases"][name] = {"px": x.shape[0], "mean": round(float(rgb.mean()), 3)}
        print(name, report["atlases"][name], flush=True)
    (cell / "compose.json").write_text(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
