"""Render one test frame, timed. Read-only on the .blend.

blender -b scene.blend --python tools/play/blender/render_probe.py -- \
    --out path.png [--cam NAME | --loc x,y,z] [--mode persp|equirect] \
    [--res 960] [--samples 96] [--device GPU|CPU] [--exposure EV] [--hide A,B] [--show A,B] [--objhide prefix,prefix] [--matswap OLD=NEW,OLD=NEW] [--search dir1;dir2]
"""
import bpy, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

a = C.parse_kv(C.argv_after_dashes())
scene = bpy.context.scene
fixed, still = C.remap_missing_images([d for d in a.get("search", "").split(";") if d])
C.set_collections(scene, hide=[h for h in a.get("hide", "").split(",") if h])
C.set_collections(scene, show=[h for h in a.get("show", "").split(",") if h])
for pref in [h for h in a.get("objhide", "").split(",") if h]:
    for o in bpy.data.objects:
        if o.name.startswith(pref):
            o.hide_render = True
swapped = C.swap_materials(dict(kv.split("=") for kv in a.get("matswap", "").split(",") if "=" in kv))
backend = C.set_device(scene, a.get("device", "GPU"))

mode = a.get("mode", "persp")
if "cam" in a:
    scene.camera = bpy.data.objects[a["cam"]]
if mode == "equirect":
    src = scene.camera
    cam_data = bpy.data.cameras.new("PLAY_probe_pano")
    cam_data.type = "PANO"
    cam_data.panorama_type = "EQUIRECTANGULAR"
    cam = bpy.data.objects.new("PLAY_probe_pano", cam_data)
    scene.collection.objects.link(cam)
    if "loc" in a:
        cam.location = [float(v) for v in a["loc"].split(",")]
    else:
        cam.location = src.matrix_world.translation
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    w = int(a.get("res", 2048))
    scene.render.resolution_x, scene.render.resolution_y = w, w // 2
elif "res" in a:
    w = int(a["res"])
    scene.render.resolution_x, scene.render.resolution_y = w, round(w * 9 / 16)
scene.render.resolution_percentage = 100
if "exposure" in a:
    scene.view_settings.exposure = float(a["exposure"])
if "samples" in a:
    scene.cycles.samples = int(a["samples"])
scene.render.image_settings.file_format = "PNG"
secs = C.timed_render(scene, a["out"])
C.report("PROBE", {"out": a["out"], "seconds": round(secs, 1), "backend": backend, "mode": mode,
                   "res": [scene.render.resolution_x, scene.render.resolution_y],
                   "samples": scene.cycles.samples, "images_remapped": fixed, "images_missing": still,
                   "swapped": swapped, "camera": scene.camera.name, "loc": [round(v, 2) for v in scene.camera.matrix_world.translation]})
