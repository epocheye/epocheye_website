"""Unwrap one mesh with xatlas (MIT). Called by blender/world_build.py, outside Blender's Python.

  python uv_atlas.py <in.npz> <out.npz> <resolution>

in.npz holds v (float32 Nx3) and f (uint32 Mx3). out.npz holds vmap, faces and uvs. Faces keep their
order, so anything stored per face stays valid.
"""
import sys

import numpy as np
import xatlas

src, dst, res = sys.argv[1], sys.argv[2], int(sys.argv[3])
with np.load(src) as d:
    v, f = d["v"].astype(np.float32), d["f"].astype(np.uint32)
atlas = xatlas.Atlas()
atlas.add_mesh(v, f)
chart = xatlas.ChartOptions()
chart.max_cost = 16.0
chart.normal_deviation_weight = 1.0
chart.roundness_weight = 0.005
chart.straightness_weight = 3.0
pack = xatlas.PackOptions()
pack.resolution = res
pack.padding = 4
pack.bilinear = True
pack.create_image = False
atlas.generate(chart_options=chart, pack_options=pack)
vmap, faces, uvs = atlas[0]
np.savez(dst, vmap=vmap, faces=faces, uvs=uvs)
print(f"xatlas: {atlas.atlas_count} atlas, {atlas.chart_count} charts, {float(atlas.utilization) * 100:.0f}% used", flush=True)
