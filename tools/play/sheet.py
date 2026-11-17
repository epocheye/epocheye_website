#!/usr/bin/env python
"""Contact sheets of cube-face renders, for checking look development and finished viewpoints.

  python tools/play/sheet.py --out sheet.jpg --thumb 320 --row "label=<dir>:<prefix>" [--row ...]

Each row is the six faces of one render in the order left, front, right, back, up, down
(nx, pz, px, nz, py, ny), read from <dir>/<prefix>_<face>.png. A missing face is drawn dark red.
A mask or tier row adds its collection pass (<prefix>_col_<face>.png alpha) the way assemble does.
"""
import argparse
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

ORDER = ["nx", "pz", "px", "nz", "py", "ny"]


def face(d, prefix, f, thumb):
    p = Path(d) / f"{prefix}_{f}.png"
    if not p.exists():
        return Image.new("RGB", (thumb, thumb), (70, 0, 0))
    im = Image.open(p)
    extra = Path(d) / f"{prefix}_col_{f}.png"
    if extra.exists():
        im = ImageChops.lighter(im.convert("L"), Image.open(extra).convert("RGBA").getchannel("A"))
    return im.convert("RGB").resize((thumb, thumb), Image.LANCZOS)


def build(rows, out, thumb):
    pad = 18
    sheet = Image.new("RGB", (thumb * 6, (thumb + pad) * len(rows)), (20, 20, 20))
    dr = ImageDraw.Draw(sheet)
    for i, (label, d, prefix) in enumerate(rows):
        y = i * (thumb + pad)
        dr.text((4, y + 3), f"{label}   [{' '.join(ORDER)}]", fill=(230, 230, 230))
        for j, f in enumerate(ORDER):
            sheet.paste(face(d, prefix, f, thumb), (j * thumb, y + pad))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=88)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--thumb", type=int, default=320)
    ap.add_argument("--row", action="append", default=[])
    a = ap.parse_args()
    rows = []
    for r in a.row:
        label, rest = r.split("=", 1)
        d, prefix = rest.rsplit(":", 1)
        rows.append((label, d, prefix))
    print(build(rows, a.out, a.thumb))
