# Posters and turntable loops for the /journeys teaser objects, rendered in headless Blender from
# the web GLBs in public/journeys/models/ with the same museum spotlight as the page.
#
#   blender -b --python scripts/journeys/render-teasers.py -- <out dir> [name|all]
#
# Writes <out dir>/<name>-poster.png (1600 square) and <out dir>/frames/<name>/####.png (144 frames).
import importlib.util
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("teasers", os.path.join(HERE, "build-teasers.py"))
teasers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(teasers)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/journeys/build")
WHICH = argv[1] if len(argv) > 1 else "all"
MODELS = os.path.abspath("public/journeys/models")
NAMES = ["palace-pillar", "fort-gateway", "victoria-dome", "museum-colonnade"]
HEIGHT = 5.5


def run(name):
    scene = teasers.reset()
    path = os.path.join(MODELS, f"{name}.glb")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    bpy.context.view_layer.update()
    # Normalise like the page: height HEIGHT, base centre at the origin.
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    size = hi - lo
    k = HEIGHT / (size.z or 1)
    root.scale = (k, k, k)
    root.location = (-(lo.x + hi.x) / 2 * k, -(lo.y + hi.y) / 2 * k, -lo.z * k)
    bpy.context.view_layer.update()
    for o in meshes:
        for m in o.data.materials:
            if m and m.node_tree:
                p = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if p:
                    p.inputs["Roughness"].default_value = 0.78
                    p.inputs["Metallic"].default_value = 0.0
    dims = Vector((size.x * k, size.y * k, HEIGHT))
    teasers.lights((0, 0, HEIGHT * 0.55), HEIGHT)
    for light in bpy.data.lights:
        light.energy *= 1.3
    eng = teasers.set_eevee(scene)
    try:
        scene.eevee.taa_render_samples = 16
    except Exception:
        pass
    teasers.camera_for(scene, dims)
    teasers.render_still(scene, os.path.join(OUT, f"{name}-poster.png"))
    teasers.render_turntable(scene, root, os.path.join(OUT, "frames", name))
    print(f"[render-teasers] done {name} on {eng}, {dims.x:.2f} x {dims.y:.2f} x {dims.z:.2f} m")


for n in (NAMES if WHICH == "all" else [WHICH]):
    run(n)
