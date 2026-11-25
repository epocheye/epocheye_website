"""Unwrap one mesh with xatlas (MIT). Called by blender/world_build.py, outside Blender's Python.

  python uv_atlas.py <in.npz> <out.npz> <resolution>

in.npz holds v (float32 Nx3), f (uint32 Mx3) and optionally scale (float32, one per face). A face's
scale sets how many texels it gets: faces a player can see keep 1, faces nobody can see get a small
share. Charts never cross a change of scale. out.npz holds vmap, faces and uvs. Faces keep their
order, so anything stored per face stays valid.
"""
import sys

import numpy as np
import xatlas

src, dst, res = sys.argv[1], sys.argv[2], int(sys.argv[3])
with np.load(src) as d:
    v, f = d["v"].astype(np.float32), d["f"].astype(np.uint32)
    scale = d["scale"].astype(np.float32) if "scale" in d.files else np.ones(len(f), np.float32)
atlas = xatlas.Atlas()
levels = sorted(set(scale.tolist()))
parts = []
for level in levels:
    which = np.flatnonzero(scale == level)
    used, inv = np.unique(f[which], return_inverse=True)
    # xatlas sizes charts by surface area, so scaling a part's positions scales its texels.
    atlas.add_mesh(v[used] * level, inv.reshape(-1, 3).astype(np.uint32))
    parts.append((which, used))
chart = xatlas.ChartOptions()
chart.max_cost = 16.0
chart.normal_deviation_weight = 1.0
chart.roundness_weight = 0.005
chart.straightness_weight = 3.0
pack = xatlas.PackOptions()
pack.resolution = res
# Thousands of small detail charts each pay the padding on every side: at 8 px on a 4096 atlas the
# gutters took over half the atlas. compose_world.py fills every gutter from the nearest chart, so a
# thin gutter still mipmaps cleanly, and the walls get the texels back.
pack.padding = max(2, round(res / 1365))
pack.bilinear = True
pack.create_image = False
atlas.generate(chart_options=chart, pack_options=pack)
vmaps, uvs_all, faces = [], [], np.empty((len(f), 3), np.int64)
at = 0
for k, (which, used) in enumerate(parts):
    vmap, part_faces, part_uvs = atlas[k]
    vmaps.append(used[vmap])
    uvs_all.append(part_uvs)
    faces[which] = part_faces.astype(np.int64) + at
    at += len(vmap)
np.savez(dst, vmap=np.concatenate(vmaps), faces=faces, uvs=np.concatenate(uvs_all))
print(f"xatlas: {atlas.atlas_count} atlas, {atlas.chart_count} charts, {float(atlas.utilization) * 100:.0f}% used, {len(levels)} texel levels", flush=True)
