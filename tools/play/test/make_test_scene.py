"""Phase 4 throwaway test scene for Epocheye Play. Never ships.

Builds a tiny scene from nothing and saves it to tools/play/out/test/test_scene.blend (a file this
repo owns; no site's Blender project is opened or touched):
  - a ground plane, three boxes, a sun and a plain sky
  - one "lost" element: the middle box's top. In THEN it is painted with a reconstructed material
    (tier suffix __DECORATION-RECONSTRUCTED); NOW swaps it for plain grey
  - two cameras' worth of positions are given in the site config, not in the scene

blender -b --factory-startup --python tools/play/test/make_test_scene.py -- <out.blend>
"""
import bpy, sys, os

out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
scn.cycles.samples = 32
scn.view_settings.view_transform = "AgX"

def mat(name, rgb, rough=0.6):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    return m

M = {
    "ground": mat("TEST_GROUND__CONFIRMED", (0.32, 0.28, 0.22), 0.9),
    "stone": mat("TEST_STONE__CONFIRMED", (0.55, 0.53, 0.5)),
    "lost": mat("TEST_PAINT__DECORATION-RECONSTRUCTED", (0.55, 0.08, 0.05), 0.4),
    "plain": mat("TEST_PLAIN__PRESENT-STATE", (0.62, 0.62, 0.6)),
}

def box(name, loc, size, m):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = [s / 2 for s in size]
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    return o

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
g = bpy.context.active_object; g.name = "Test_ground__CONFIRMED"; g.data.materials.append(M["ground"])
box("Test_box_left__CONFIRMED", (-3, 4, 1), (1.6, 1.6, 2), M["stone"])
box("Test_box_middle__CONFIRMED", (0, 5, 1.25), (2, 2, 2.5), M["stone"])
box("Test_cap_middle__DECORATION-RECONSTRUCTED", (0, 5, 2.65), (2.2, 2.2, 0.3), M["lost"])
box("Test_box_right__CONFIRMED", (3, 4, 0.75), (1.4, 1.4, 1.5), M["stone"])

sun_d = bpy.data.lights.new("Test_sun", "SUN"); sun_d.energy = 4.0; sun_d.angle = 0.05
sun = bpy.data.objects.new("Test_sun", sun_d); scn.collection.objects.link(sun)
sun.rotation_euler = (0.9, 0.2, 0.6)
w = bpy.data.worlds.new("Test_sky"); w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.45, 0.6, 0.85, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.8
scn.world = w

cam = bpy.data.objects.new("Test_cam", bpy.data.cameras.new("Test_cam")); scn.collection.objects.link(cam)
scn.camera = cam
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("TEST_SCENE_SAVED", out)
