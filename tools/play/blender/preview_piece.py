"""Render a small preview of exported piece GLBs, to check texture and orientation by eye.

blender -b --factory-startup --python tools/play/blender/preview_piece.py -- --out <png> --glb a.glb,b.glb,c.glb

An empty scene, never the site's .blend. Cycles on the CPU (a few seconds), so it needs no GPU guard.
The camera sits where the game's piece viewer puts it: in front (site -Y), a little right and above.
"""
import bpy, sys, math
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
kv = {args[i].lstrip("-"): args[i + 1] for i in range(0, len(args), 2)}
glbs = kv["glb"].split(",")

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
x = 0.0
for g in glbs:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=g)
    new = [o for o in bpy.data.objects if o not in before]
    pts = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    centre = (lo + hi) / 2; rad = max((hi - lo).length / 2, 1e-4)
    for o in new:
        if o.parent is None:
            o.matrix_world.translation = (o.matrix_world.translation - centre) / rad + Vector((x, 0, 0))
            o.scale = o.scale / rad
    x += 2.4
mid = (x - 2.4) / 2
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scn.collection.objects.link(cam)
d = Vector((0.9, -4.3, 0.7)).normalized() * 6.2
cam.location = Vector((mid, 0, 0)) + d
cam.rotation_euler = (Vector((mid, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.type = "ORTHO"; cam.data.ortho_scale = 2.4 * len(glbs) + 0.4
scn.camera = cam
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(55), 0, math.radians(25))
scn.collection.objects.link(sun)
w = bpy.data.worlds.new("w"); w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
scn.world = w
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 24
scn.render.resolution_x = 420 * len(glbs); scn.render.resolution_y = 520
scn.view_settings.view_transform = "Standard"
scn.render.filepath = kv["out"]
bpy.ops.render.render(write_still=True)
print("PREVIEW_DONE", kv["out"])
