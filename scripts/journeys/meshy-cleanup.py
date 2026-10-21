# Clean up Meshy teaser GLBs for /journeys in headless Blender.
#
#   blender -b --python scripts/journeys/meshy-cleanup.py -- <out dir> [name|all] [source dir]
#
# Reads .journeys-build/meshy/<name>.glb (and <name>-today.glb for the hero), then:
#   decimate to <= 30,000 triangles, fix normals, origin at the base centre,
#   bake the museum-spotlight lighting into one texture (2048 hero, 1024 cards),
#   bake a second "today" set for the hero from the retextured GLB on the same UVs,
#   export <name>.glb, render <name>-poster.png and the 144-frame turntable.
# Output layout matches build-teasers.py, so scripts/journeys-assets.mjs --process finishes the job.
import importlib.util
import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("teasers", os.path.join(HERE, "build-teasers.py"))
teasers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(teasers)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "public/journeys/build")
WHICH = argv[1] if len(argv) > 1 else "all"
SRC = os.path.abspath(argv[2]) if len(argv) > 2 else os.path.join(OUT, "meshy")
os.makedirs(OUT, exist_ok=True)

NAMES = ["palace-pillar", "fort-gateway", "victoria-dome", "museum-colonnade"]
TEX = {}  # bake everything at 2048; scripts/journeys-assets.mjs downsizes the cards to 1024


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in new:
        if o.type != "MESH":
            bpy.data.objects.remove(o, do_unlink=True)
    return meshes


def base_color_image(obj):
    for m in obj.data.materials:
        if not m or not m.node_tree:
            continue
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image:
                return n.image
    return None


def prepare_high(parts, name):
    """Join, apply transforms, origin at base centre, normalise height. Keeps the Meshy UVs."""
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(parts) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name + "_high"
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    cx, cy, z0 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= z0
    obj.location = (0, 0, 0)
    # Normalise height to about 5.5 m so the page's keyframes fit every object the same way.
    h = max(v.co.z for v in obj.data.vertices)
    k = 5.5 / h if h else 1.0
    for v in obj.data.vertices:
        v.co *= k
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    print(f"[meshy-cleanup] {name}: source {tris} tris")
    # Meshy meshes run to 1 to 2.5 million triangles; Cycles runs out of memory baking from them
    # at 2048. A 350k source keeps every visible detail and bakes comfortably.
    if tris > 350000:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        dec = obj.modifiers.new("predec", "DECIMATE")
        dec.ratio = 350000 / tris
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)
        print(f"[meshy-cleanup] {name}: source reduced to {sum(len(p.vertices) - 2 for p in obj.data.polygons)} tris for baking")
    return obj


def make_low(high, name):
    """Decimated copy with fresh UVs: the bake target. The high mesh keeps the Meshy texture."""
    low = high.copy()
    low.data = high.data.copy()
    low.name = name
    bpy.context.collection.objects.link(low)
    bpy.ops.object.select_all(action="DESELECT")
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    tris = sum(len(p.vertices) - 2 for p in low.data.polygons)
    if tris > teasers.TRI_BUDGET:
        dec = low.modifiers.new("dec", "DECIMATE")
        dec.ratio = (teasers.TRI_BUDGET * 0.95) / tris
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0005)
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.uv.smart_project(angle_limit=1.45, island_margin=0.002, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=0.6)
    except Exception:
        bpy.ops.object.shade_smooth()
    low.data.materials.clear()
    m, nt, p = teasers.new_mat(name + "_bake")
    low.data.materials.append(m)
    tris = sum(len(p.vertices) - 2 for p in low.data.polygons)
    dims = low.dimensions.copy()
    print(f"[meshy-cleanup] {name}: {tris} tris, size {dims.x:.2f} x {dims.y:.2f} x {dims.z:.2f} m")
    return low, dims


def bake_high_to_low(scene, high, low, size, path):
    """Cycles selected-to-active bake: the high mesh's texture and the lights land on the low UVs."""
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    bk = scene.render.bake
    bk.margin = 16
    bk.use_pass_direct = True
    bk.use_pass_indirect = True
    bk.use_pass_color = True
    bk.use_selected_to_active = True
    bk.use_cage = False
    bk.cage_extrusion = 0.12
    bk.max_ray_distance = 0.0
    img = bpy.data.images.new(os.path.basename(path), size, size, alpha=False)
    m = low.data.materials[0]
    n = m.node_tree.nodes.new("ShaderNodeTexImage")
    n.image = img
    m.node_tree.nodes.active = n
    bpy.ops.object.select_all(action="DESELECT")
    high.select_set(True)
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    high.hide_render = False
    bpy.ops.object.bake(type="COMBINED")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    m.node_tree.nodes.remove(n)
    return img


def set_base_color(obj, image):
    """Point every material's image texture at `image` (same UVs, different texture set)."""
    for m in obj.data.materials:
        if not m or not m.node_tree:
            continue
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE":
                n.image = image


def run(name):
    scene = teasers.reset()
    src = os.path.join(SRC, f"{name}.glb")
    if not os.path.exists(src):
        print(f"[meshy-cleanup] missing {src}")
        return
    high = prepare_high(import_glb(src), name)
    for m in high.data.materials:
        if m and m.node_tree:
            p = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if p:
                p.inputs["Roughness"].default_value = max(p.inputs["Roughness"].default_value, 0.55)
    low, dims = make_low(high, name)
    teasers.lights((0, 0, dims.z * 0.55), dims.z)
    for light in bpy.data.lights:  # Meshy surfaces are darker than the procedural ones
        light.energy *= 1.6
    size = TEX.get(name, 2048)
    img = bake_high_to_low(scene, high, low, size, os.path.join(OUT, f"{name}.png"))

    today_src = os.path.join(SRC, f"{name}-today.glb")
    if os.path.exists(today_src):
        then_image = base_color_image(high)
        today_parts = import_glb(today_src)
        today_image = base_color_image(today_parts[0]) if today_parts else None
        for o in today_parts:
            bpy.data.objects.remove(o, do_unlink=True)
        if today_image:
            set_base_color(high, today_image)
            bake_high_to_low(scene, high, low, size, os.path.join(OUT, f"{name}-today.png"))
            set_base_color(high, then_image)

    bpy.data.objects.remove(high, do_unlink=True)
    low.data.materials.clear()
    low.data.materials.append(teasers.export_material(img))
    teasers.export_glb(low, os.path.join(OUT, f"{name}.glb"))
    low.data.materials.clear()
    low.data.materials.append(teasers.baked_material(img))
    eng = teasers.set_eevee(scene)
    try:
        scene.eevee.taa_render_samples = 8
    except Exception:
        pass
    teasers.camera_for(scene, dims)
    try:
        teasers.render_still(scene, os.path.join(OUT, f"{name}-poster.png"))
        teasers.render_turntable(scene, low, os.path.join(OUT, "frames", name))
    except Exception as e:
        print("[meshy-cleanup] render failed on", eng, "->", e)
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "FLAT"
        scene.display.shading.color_type = "TEXTURE"
        teasers.render_still(scene, os.path.join(OUT, f"{name}-poster.png"))
        teasers.render_turntable(scene, low, os.path.join(OUT, "frames", name))
    print(f"[meshy-cleanup] done {name}")


for n in (NAMES if WHICH == "all" else [WHICH]):
    run(n)
