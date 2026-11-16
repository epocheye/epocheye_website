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
    scene.cycles.device = "CPU"
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
    pairs = {k: bpy.data.materials.get(v) for k, v in mapping.items()}
    for o in bpy.data.objects:
        for slot in getattr(o, "material_slots", []):
            if slot.material and slot.material.name in pairs and pairs[slot.material.name]:
                slot.material = pairs[slot.material.name]; n += 1
    return n


def timed_render(scene, filepath):
    scene.render.filepath = filepath
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t0


def report(tag, payload):
    print("@@" + tag + " " + json.dumps(payload))
