"""Shared helpers for the Play exporter's Blender-side scripts.

Everything here changes the scene IN MEMORY only. No script in this folder
ever calls save_mainfile or save_as_mainfile: the site's .blend is read-only.
"""
import bpy, os, sys, time, json


def argv_after_dashes():
    return sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def parse_kv(args):
    """--key value pairs -> dict (flags without a value become True)."""
    out, i = {}, 0
    while i < len(args):
        k = args[i].lstrip("-")
        if i + 1 < len(args) and not args[i + 1].startswith("--"):
            out[k] = args[i + 1]; i += 2
        else:
            out[k] = True; i += 1
    return out


def enable_gpu(prefer=("OPTIX", "CUDA")):
    """Turn on the GPU for Cycles in background mode. Returns the backend used, or None."""
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in prefer:
        try:
            prefs.compute_device_type = backend
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == backend]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == backend
            return backend
    return None


def set_device(scene, device):
    if device.upper() == "GPU":
        backend = enable_gpu()
        scene.cycles.device = "GPU" if backend else "CPU"
        return backend or "CPU"
    # CPU only: keep CUDA out of the process entirely, including the OptiX denoiser and the
    # viewport/compositor devices, so a faulted GPU driver cannot stop a CPU render.
    try:
        bpy.context.preferences.addons["cycles"].preferences.compute_device_type = "NONE"
    except Exception:
        pass
    scene.cycles.device = "CPU"
    if getattr(scene.cycles, "denoiser", None) == "OPTIX":
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    if hasattr(scene.cycles, "denoising_use_gpu"):
        scene.cycles.denoising_use_gpu = False
    if hasattr(scene.render, "compositor_device"):
        scene.render.compositor_device = "CPU"
    return "CPU"


def remap_missing_images(search_dirs):
    """Point missing image files at copies found in search_dirs (in memory only)."""
    fixed, still = [], []
    for img in bpy.data.images:
        if img.source != "FILE" or img.packed_file or not img.filepath:
            continue
        p = bpy.path.abspath(img.filepath)
        if os.path.exists(p):
            continue
        base = os.path.basename(p)
        for d in search_dirs:
            cand = os.path.join(d, base)
            if os.path.exists(cand):
                img.filepath = cand
                img.reload()
                fixed.append(base)
                break
        else:
            still.append(base)
    return fixed, still


def _layer_collections(lc, out=None):
    out = {} if out is None else out
    out[lc.collection.name] = lc
    for k in lc.children:
        _layer_collections(k, out)
    return out


def set_collections(scene, hide=(), show=()):
    """Hide or show collections for render, by name (render flag and view-layer exclude)."""
    lcs = _layer_collections(bpy.context.view_layer.layer_collection)
    state = {}
    for name, on in [(n, False) for n in hide] + [(n, True) for n in show]:
        c = bpy.data.collections.get(name)
        if not c:
            state[name] = "missing"; continue
        c.hide_render = not on
        if name in lcs:
            lcs[name].exclude = not on
        if on:
            for o in c.objects:
                o.hide_render = False
        state[name] = "shown" if on else "hidden"
    return state


def swap_materials(mapping):
    """Replace material OLD with NEW on every slot that uses it (in memory only)."""
    n = 0
    missing = sorted(v for v in mapping.values() if not bpy.data.materials.get(v))
    if missing:
        # A NOW state that silently keeps the THEN material would look restored when it is not.
        raise RuntimeError(f"matswap target material(s) not in the scene: {missing}")
    pairs = {k: bpy.data.materials.get(v) for k, v in mapping.items()}
    for o in bpy.data.objects:
        for slot in getattr(o, "material_slots", []):
            if slot.material and slot.material.name in pairs and pairs[slot.material.name]:
                slot.material = pairs[slot.material.name]; n += 1
    return n


def make_pbr(name, spec):
    """Build a material in memory from image files: color, optional normal and ORM (R ao, G rough, B metal).
    Box-projected in object space so it needs no UVs. spec: {color, normal?, orm?, scale?, roughness?, tint?}"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    sc = float(spec.get("scale", 1.0))
    mp.inputs["Scale"].default_value = (sc, sc, sc)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])

    def tex(path, colorspace):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        n.image.colorspace_settings.name = colorspace
        n.projection = "BOX"
        n.projection_blend = 0.25
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n

    col = tex(spec["color"], "sRGB")
    if spec.get("tint"):
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[7].default_value = (*spec["tint"], 1.0)
        nt.links.new(col.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    else:
        nt.links.new(col.outputs["Color"], bsdf.inputs["Base Color"])
    if spec.get("orm"):
        orm = tex(spec["orm"], "Non-Color")
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(orm.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    elif spec.get("rough"):
        rg = tex(spec["rough"], "Non-Color")
        nt.links.new(rg.outputs["Color"], bsdf.inputs["Roughness"])
    else:
        bsdf.inputs["Roughness"].default_value = float(spec.get("roughness", 0.7))
    if spec.get("normal"):
        nrm = tex(spec["normal"], "Non-Color")
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.space = "OBJECT" if False else "TANGENT"
        nm.inputs["Strength"].default_value = float(spec.get("normal_strength", 0.6))
        nt.links.new(nrm.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def add_haze(spec):
    """A soft wall of haze around the site so the unmodelled surroundings are not shown.
    spec: {center:[x,y], radius, height, color:[r,g,b], base_z?}. In memory only."""
    import bmesh
    cx, cy = spec.get("center", [0, 0])
    r, h = float(spec["radius"]), float(spec.get("height", 60))
    z0 = float(spec.get("base_z", -2))
    me = bpy.data.meshes.new("PLAY_haze")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=96, radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("PLAY_haze", me)
    ob.location = (cx, cy, z0 + h / 2)
    bpy.context.scene.collection.objects.link(ob)
    m = bpy.data.materials.new("PLAY_haze"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    rng = nt.nodes.new("ShaderNodeMapRange")
    rng.inputs["From Min"].default_value = z0 + h * float(spec.get("solid_to", 0.12))
    rng.inputs["From Max"].default_value = z0 + h * float(spec.get("clear_at", 0.55))
    rng.inputs["To Min"].default_value = 0.0
    rng.inputs["To Max"].default_value = 1.0
    rng.interpolation_type = "SMOOTHSTEP"
    dif = nt.nodes.new("ShaderNodeEmission")   # unlit, so the haze is even all the way round
    dif.inputs["Color"].default_value = (*spec.get("color", [0.78, 0.8, 0.82]), 1)
    dif.inputs["Strength"].default_value = float(spec.get("strength", 4.0))
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], rng.inputs["Value"])
    nt.links.new(rng.outputs["Result"], mix.inputs[0])
    nt.links.new(dif.outputs[0], mix.inputs[1])
    nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    ob.data.materials.append(m)
    ob.visible_shadow = False
    ob.visible_diffuse = False
    ob.visible_glossy = False
    return ob


def split_sky_sun(scene, work_dir, device="GPU"):
    """Move the Sky Texture's sun disc into a real Sun lamp of the same power, colour and direction.

    The disc is a tiny, very bright patch of the world. Cycles samples the world by brightness, so
    nearly every light sample goes to the disc, and a point the sun cannot reach gets almost none of
    the sky: most texels in shade bake to exactly zero. A lamp is sampled on its own, so shade gets
    clean sky light. In memory only. Returns what it did, or None if the world has no sun disc."""
    import math
    from mathutils import Vector
    world = scene.world
    sky = next((n for n in world.node_tree.nodes if n.type == "TEX_SKY"), None) if world and world.node_tree else None
    if sky is None or not getattr(sky, "sun_disc", False):
        return None
    el, rot = sky.sun_elevation, sky.sun_rotation
    to_sun = Vector((math.sin(rot) * math.cos(el), math.cos(rot) * math.cos(el), math.sin(el)))

    # Measure the disc: a white plane square on to the sun, rendered with the disc and without it.
    test = bpy.data.scenes.new("PLAY_sun_probe")
    test.world = world
    test.render.engine = "CYCLES"
    set_device(test, device)
    test.cycles.samples = 256
    test.cycles.use_denoising = False
    test.cycles.use_adaptive_sampling = False
    test.render.resolution_x = test.render.resolution_y = 16
    test.render.use_compositing = False
    test.render.image_settings.file_format = "OPEN_EXR"
    test.render.image_settings.color_mode = "RGBA"
    test.render.image_settings.color_depth = "32"
    white = bpy.data.materials.new("PLAY_probe_white")
    white.use_nodes = True
    bsdf = next(n for n in white.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.0
    me = bpy.data.meshes.new("PLAY_probe")
    me.from_pydata([(-50, -50, 0), (50, -50, 0), (50, 50, 0), (-50, 50, 0)], [], [(0, 1, 2, 3)])
    me.materials.append(white)
    plane = bpy.data.objects.new("PLAY_probe", me)
    plane.rotation_mode = "QUATERNION"
    plane.rotation_quaternion = to_sun.to_track_quat("Z", "Y")
    test.collection.objects.link(plane)
    cam_d = bpy.data.cameras.new("PLAY_probe")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 2
    cam = bpy.data.objects.new("PLAY_probe_cam", cam_d)
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = to_sun.to_track_quat("Z", "Y")
    cam.location = to_sun * 5
    test.collection.objects.link(cam)
    test.camera = cam
    window = bpy.context.window
    before = window.scene if window else None
    if window:
        window.scene = test

    def measure(tag):
        path = os.path.join(work_dir, f"_sun_probe_{tag}.exr")
        test.render.filepath = path
        bpy.ops.render.render(write_still=True, scene=test.name)
        img = bpy.data.images.load(path)
        px = list(img.pixels)
        n = len(px) // 4
        rgb = [sum(px[i::4]) / n for i in range(3)]
        bpy.data.images.remove(img)
        os.remove(path)
        return rgb

    on = measure("on")
    sky.sun_disc = False
    off = measure("off")
    if window and before:
        window.scene = before
    bpy.data.objects.remove(plane)
    bpy.data.objects.remove(cam)
    bpy.data.meshes.remove(me)
    bpy.data.cameras.remove(cam_d)
    bpy.data.materials.remove(white)
    bpy.data.scenes.remove(test)

    # A white diffuse plane leaves at E / pi, so the disc's irradiance is the difference times pi.
    disc = [max(a - b, 0.0) for a, b in zip(on, off)]
    peak = max(disc)
    if peak <= 0:
        sky.sun_disc = True
        raise RuntimeError(f"Sun probe measured no disc: with {on}, without {off}")
    lamp = bpy.data.lights.new("PLAY_sun", "SUN")
    lamp.energy = peak * math.pi
    lamp.color = [c / peak for c in disc]
    lamp.angle = max(sky.sun_size, math.radians(0.5))
    ob = bpy.data.objects.new("PLAY_sun", lamp)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = to_sun.to_track_quat("Z", "Y")
    scene.collection.objects.link(ob)
    return {"strength": round(lamp.energy, 3), "color": [round(c, 4) for c in lamp.color], "to_sun": [round(c, 4) for c in to_sun],
            "elevation_deg": round(math.degrees(el), 2), "rotation_deg": round(math.degrees(rot), 2),
            "sky_only_on_white": [round(c, 4) for c in off], "object": ob.name}


def view_lut(scene, size=65, lo=-16.0, hi=8.0):
    """The scene's display transform (view, look, display) sampled as a 3D table over log2 of
    scene-linear light, from Blender's own OpenColorIO config. Exposure is not in it: the caller
    multiplies by 2**exposure first. A table, not a fitted curve: the AgX fit compose_world.py used
    before lifted shade and drained colour compared with what Blender shows."""
    import numpy as np
    import PyOpenColorIO as OCIO
    vs, ds = scene.view_settings, scene.display_settings
    path = os.environ.get("OCIO") or os.path.join(bpy.utils.system_resource("DATAFILES"), "colormanagement", "config.ocio")
    cfg = OCIO.Config.CreateFromFile(path)
    look = vs.look if vs.look and vs.look != "None" else ""
    # Blender shows a look as "<view> - <look>". OCIO reads "a - b" as look a then the inverse of b,
    # so the view's prefix comes off unless the config really has a look by the full name.
    if look and cfg.getLook(look) is None and look.startswith(vs.view_transform + " - "):
        look = look[len(vs.view_transform) + 3:]
    if look and cfg.getLook(look) is None:
        raise RuntimeError(f"OCIO config has no look {vs.look!r}")
    pipe = OCIO.LegacyViewingPipeline()
    pipe.setDisplayViewTransform(OCIO.DisplayViewTransform(src=cfg.getColorSpace("scene_linear").getName(),
                                                           display=ds.display_device, view=vs.view_transform))
    if look:
        pipe.setLooksOverrideEnabled(True)
        pipe.setLooksOverride(look)
    cpu = pipe.getProcessor(cfg).getDefaultCPUProcessor()
    axis = 2.0 ** np.linspace(lo, hi, size)
    r, g, b = np.meshgrid(axis, axis, axis, indexing="ij")
    rgb = np.ascontiguousarray(np.stack((r, g, b), -1).reshape(-1, 3).astype(np.float32))
    cpu.applyRGB(rgb)
    return {"table": rgb.reshape(size, size, size, 3), "lo": lo, "hi": hi, "view": vs.view_transform,
            "look": look, "display": ds.display_device, "gamma": vs.gamma}


def timed_render(scene, filepath):
    scene.render.filepath = filepath
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t0


def report(tag, payload):
    print("@@" + tag + " " + json.dumps(payload))
