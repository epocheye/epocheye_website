# Gives a static animal model a simple rig and a few moves, headless, CPU only. The source GLB is
# only read. Writes one GLB with the skin and clips, and a JSON with what the game needs to know.
#
#   blender -b --factory-startup --python tools/play/blender/rig_ride.py -- --spec tools/play/rides/horse.json
#
# The legs are solved with two-bone IK against a planted foot path, so a foot on the ground does not
# slide while the clip plays at its recorded ground speed (written to the JSON as "strides").

import argparse
import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Quaternion, Vector

FPS = 24
LEGS = ("fl", "fr", "hl", "hr")


def args():
    p = argparse.ArgumentParser()
    p.add_argument("--spec", required=True)
    p.add_argument("--debug", default=None, help="Folder for check renders")
    return p.parse_args(sys.argv[sys.argv.index("--") + 1:])


# ---------------------------------------------------------------- mesh


def load_mesh(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=spec["src"])
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if len(meshes) != 1:
        sys.exit(f"Expected one mesh, found {len(meshes)}")
    o = meshes[0]
    o.parent = None
    o.data.transform(o.matrix_world)
    o.matrix_world.identity()
    return o


def verts_of(o):
    n = len(o.data.vertices)
    co = np.zeros(n * 3)
    o.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def set_verts(o, co):
    o.data.vertices.foreach_set("co", co.ravel())
    o.data.update()


def prepare(o, spec):
    """Strips what must not ship, welds the UV-split shells, moves it to real size with its feet on
    z = 0, and simplifies. Returns the transform from source coordinates to model coordinates."""
    co = verts_of(o)
    for f in spec.get("flatten", []):
        hit = (co[:, 1] > f["y"][0]) & (co[:, 1] < f["y"][1]) & (co[:, 2] > f["z"])
        co[hit, 2] = f["z"] + (co[hit, 2] - f["z"]) * f.get("keep", 0.1)
    offset = np.array([(co[:, 0].min() + co[:, 0].max()) / 2, (co[:, 1].min() + co[:, 1].max()) / 2, co[:, 2].min()])
    scale = float(spec["scale"])
    set_verts(o, (co - offset) * scale)

    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006 * scale)
    bm.to_mesh(o.data)
    bm.free()
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    mod = o.modifiers.new("simplify", "DECIMATE")
    mod.ratio = min(1.0, spec["tris"] / tris)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.polygons.foreach_set("use_smooth", [True] * len(o.data.polygons))
    o.data.update()
    return lambda p: (np.asarray(p, dtype=float) - offset) * scale


def leg_chain(co, to_model, leg, spec, skip=None):
    """Finds a leg's joints from the mesh: the middle of its cross-section, slice by slice, from the hoof up."""
    foot = to_model(leg["foot"])
    top_z = float(to_model([0, 0, leg["top_z"]])[2])
    radius = float(leg.get("radius", spec["leg_radius"])) * spec["scale"]
    step = 0.035
    at = foot[:2].copy()
    path = []
    z = float(co[:, 2].min()) + step
    while z < top_z:
        band = (co[:, 2] >= z - step) & (co[:, 2] < z + step)
        near = band & (np.hypot(co[:, 0] - at[0], co[:, 1] - at[1]) < radius)
        if skip is not None:
            near &= ~skip
        if near.sum() >= 4:
            at = at * 0.45 + co[near, :2].mean(axis=0) * 0.55
        path.append((at[0], at[1], z))
        z += step
    path = np.array(path)

    def at_height(k):
        h = float(co[:, 2].min()) + (top_z - float(co[:, 2].min())) * k
        i = int(np.clip(np.searchsorted(path[:, 2], h), 0, len(path) - 1))
        return path[i].copy()

    hip = at_height(1.0)
    hip[2] = top_z
    knee = at_height(float(leg["knee"]))
    ankle = at_height(float(leg["ankle"]))
    sole = np.array([ankle[0], foot[1], float(co[:, 2].min())])
    return {"hip": hip, "knee": knee, "ankle": ankle, "sole": sole}


# ---------------------------------------------------------------- skeleton


def build_bones(spec, to_model, co, o):
    """Name -> (head, tail, parent, radius or None for an unmasked body bone, fade-top z or None)."""
    bones = {}
    P = lambda k: to_model(spec["points"][k])
    bones["root"] = (np.array([0, 0, 0.0]), np.array([0, 0.3, 0.0]), None, 0, None)
    chain = spec["spine"]
    parent = "root"
    for i, name in enumerate(("body", "spine", "chest", "neck", "head")):
        bones[name] = (P(chain[i]), P(chain[i + 1]), parent, None, None)
        parent = name
    skip = dull_mask(o, spec["hair"], co, to_model) if spec.get("hair") else None
    legs = {leg: leg_chain(co, to_model, spec["legs"][leg], spec, skip) for leg in LEGS}
    # At the top of a leg the mesh is the whole body, so its middle says nothing about the joint.
    # The shoulder or hip sits above the middle of the pair of feet, in line with the knee.
    for pair in (("fl", "fr"), ("hl", "hr")):
        y = sum(float(legs[l]["sole"][1]) for l in pair) / 2
        for l in pair:
            legs[l]["hip"][0] = legs[l]["knee"][0]
            legs[l]["hip"][1] = y
            # A pillar leg: the knee sits on the line from hip to ankle, a little forward, so it
            # bends only slightly and never folds.
            if spec.get("pillar_legs"):
                c = legs[l]
                k = float(spec["legs"][l]["knee"])
                c["knee"] = c["hip"] + (c["ankle"] - c["hip"]) * (1 - k)
                c["knee"][1] -= 0.035 * float(np.linalg.norm(c["ankle"] - c["hip"]))
    for leg in LEGS:
        c = legs[leg]
        host = "chest" if leg[0] == "f" else "body"
        rad = float(spec["legs"][leg].get("bind", spec["leg_bind"])) * spec["scale"]
        fade = float(c["hip"][2]) + 0.02
        bones[f"{leg}_up"] = (c["hip"], c["knee"], host, rad, fade)
        low = float(spec["legs"][leg].get("bind_low", spec.get("leg_bind_low", spec["leg_bind"]))) * spec["scale"]
        bones[f"{leg}_low"] = (c["knee"], c["ankle"], f"{leg}_up", low, fade)
        bones[f"{leg}_foot"] = (c["ankle"], c["sole"], f"{leg}_low", low, fade)
    for group in spec.get("chains", []):
        pts = [to_model(p) for p in group["points"]]
        prev = group["parent"]
        for i in range(len(pts) - 1):
            name = f"{group['name']}{i + 1}" if len(pts) > 2 else group["name"]
            bones[name] = (pts[i], pts[i + 1], prev, float(group["radius"]) * spec["scale"], None)
            prev = name
    seat = to_model(spec["seat"])
    bones["seat"] = (seat, seat + np.array([0, 0, 0.15]), spec.get("seat_parent", "spine"), -1, None)
    return bones, legs


def make_armature(bones):
    arm = bpy.data.armatures.new("rig")
    rig = bpy.data.objects.new("rig", arm)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for name, (h, t, _, _, _) in bones.items():
        e = arm.edit_bones.new(name)
        e.head, e.tail = Vector(h), Vector(t)
        if (e.tail - e.head).length < 0.02:
            e.tail = e.head + Vector((0, 0.03, 0))
    for name, (_, _, parent, _, _) in bones.items():
        if parent:
            arm.edit_bones[name].parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for b in rig.pose.bones:
        b.rotation_mode = "QUATERNION"
    return rig


def dull_mask(o, rule, co, to_model):
    """Long hair is dull where the coat is a saturated colour."""
    me = o.data
    node = next(n for n in o.active_material.node_tree.nodes if n.type == "BSDF_PRINCIPLED").inputs["Base Color"].links[0].from_node
    img = node.image
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    rgb = px.reshape(h, w, 4)[:, :, :3]
    uv = np.zeros(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    vi = np.zeros(len(me.loops), dtype=np.int64)
    me.loops.foreach_get("vertex_index", vi)
    i = np.clip((uv[:, 0] % 1.0 * w).astype(int), 0, w - 1)
    j = np.clip((uv[:, 1] % 1.0 * h).astype(int), 0, h - 1)
    n = len(me.vertices)
    count = np.maximum(np.bincount(vi, minlength=n), 1)
    c = np.stack([np.bincount(vi, weights=rgb[j, i, k], minlength=n) / count for k in range(3)], axis=1)
    mx, mn = c.max(axis=1), c.min(axis=1)
    dull = ((mx - mn) / np.maximum(mx, 1e-3) < rule["saturation"]) & (mx < rule["value"])
    return dull & (co[:, 1] > float(to_model([0, rule["y_min"], 0])[1])) & (co[:, 2] > float(to_model([0, 0, rule["z_min"]])[2]))


def hair_mask(o, rule, co, to_model, legs):
    """The dull vertices clear of the legs, grown over the mesh so no strand is missed."""
    me = o.data
    n = len(me.vertices)
    hair = dull_mask(o, rule, co, to_model)
    # Shaded skin on the inside of a leg can be as dull as hair, so what hugs the leg stays leg.
    clear = np.full(len(co), np.inf)
    for leg in ("hl", "hr"):
        c = legs[leg]
        for p, q in (("hip", "knee"), ("knee", "ankle"), ("ankle", "sole")):
            ab = c[q] - c[p]
            u = np.clip(((co - c[p]) * ab).sum(axis=1) / max((ab * ab).sum(), 1e-9), 0, 1)
            clear = np.minimum(clear, np.linalg.norm(co - (c[p] + u[:, None] * ab), axis=1))
    away = clear > float(rule.get("clear", 0.05))
    hair &= away
    edges = np.zeros(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get("vertices", edges)
    edges = edges.reshape(-1, 2)
    for _ in range(2):
        votes = np.bincount(edges[hair[edges[:, 0]], 1], minlength=n) + np.bincount(edges[hair[edges[:, 1]], 0], minlength=n)
        hair |= (votes >= 2) & away
    return hair


def cut_hair_from_legs(o, D, names, hair, legs, co):
    """The source mesh fuses the tail to the hind leg it hangs against. Where it does, a leg in
    stride drags a web of faces out of the tail, so those few faces are removed. Vertex order is kept."""
    hind = [j for j, n in enumerate(names) if n[:3] in ("hl_", "hr_")]
    total = np.maximum(D.sum(axis=1), 1e-12)
    on_leg = D[:, hind].sum(axis=1) / total > 0.2
    top = min(float(legs["hl"]["hip"][2]), float(legs["hr"]["hip"][2])) - 0.03
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.verts.ensure_lookup_table()
    doomed = []
    for f in bm.faces:
        ids = [v.index for v in f.verts]
        if any(hair[i] for i in ids) and any(on_leg[i] and not hair[i] for i in ids) and f.calc_center_median().z < top:
            doomed.append(f)
    bmesh.ops.delete(bm, geom=doomed, context="FACES_ONLY")
    bm.to_mesh(o.data)
    bm.free()
    print("RIG_CUT", len(doomed))


def bind(o, rig, bones, spec, to_model, legs):
    co = verts_of(o)
    names = [n for n, b in bones.items() if b[3] != 0 and b[3] != -1]
    D = np.zeros((len(co), len(names)))
    for j, n in enumerate(names):
        h, t, _, radius, fade = bones[n]
        ab = t - h
        u = np.clip(((co - h) * ab).sum(axis=1) / max((ab * ab).sum(), 1e-9), 0, 1)
        dist = np.linalg.norm(co - (h + u[:, None] * ab), axis=1)
        score = 1.0 / np.power(dist + 0.015 * spec["scale"], 4)
        if radius is not None:
            # A limb bone only holds what is close to it, fading out towards its radius.
            k = np.clip(1 - (dist / radius) ** 2, 0, 1) ** 2
            score *= k
        if fade is not None:
            # Nothing above the top of the leg follows the leg, so cloth on the flank stays put.
            band = 0.16 * spec["scale"]
            score *= np.clip((fade - co[:, 2]) / band, 0, 1)
        D[:, j] = score
    # Hair and hanging cloth near a leg must not be dragged along with it.
    free = np.zeros(len(co), dtype=bool)
    def nearest(pts):
        out = np.full(len(co), np.inf)
        for a, b in zip(pts, pts[1:]):
            ab = b - a
            u = np.clip(((co - a) * ab).sum(axis=1) / max((ab * ab).sum(), 1e-9), 0, 1)
            out = np.minimum(out, np.linalg.norm(co - (a + u[:, None] * ab), axis=1))
        return out
    legs_only = np.full(len(co), np.inf)
    for n in names:
        if n[:3] in ("fl_", "fr_", "hl_", "hr_"):
            legs_only = np.minimum(legs_only, nearest([bones[n][0], bones[n][1]]))
    for group in spec.get("chains", []):
        if group.get("claim"):
            # What is nearer this chain than any leg, and within its reach, is this chain's.
            d = nearest([to_model(p) for p in group["points"]])
            free |= (d < legs_only) & (d < group["claim"] * spec["scale"])
    if spec.get("hair"):
        free |= hair_mask(o, spec["hair"], co, to_model, legs)
    for rule in spec.get("no_leg", []):
        free |= (np.abs(co[:, 0]) > rule["x_abs_min"] * spec["scale"]) & (co[:, 2] < float(to_model([0, 0, rule["z_max"]])[2])) & (co[:, 2] > float(to_model([0, 0, rule["z_min"]])[2]))
    leg_columns = [j for j, n in enumerate(names) if n[:3] in ("fl_", "fr_", "hl_", "hr_")]
    D[np.ix_(free, leg_columns)] = 0
    # A vertex belongs to at most one leg, so the skin between two legs never webs across.
    per_leg = np.stack([D[:, [j for j, n in enumerate(names) if n.startswith(leg + "_")]].sum(axis=1) for leg in LEGS], axis=1)
    owner = per_leg.argmax(axis=1)
    for k, leg in enumerate(LEGS):
        cols = [j for j, n in enumerate(names) if n.startswith(leg + "_")]
        D[np.ix_(owner != k, cols)] = 0
    if spec.get("hair"):
        cut_hair_from_legs(o, D, names, free, legs, co)
    order = np.argsort(-D, axis=1)[:, :4]
    groups = {n: o.vertex_groups.new(name=n) for n in names}
    for i in range(len(co)):
        w = D[i, order[i]]
        total = w.sum()
        for j, x in zip(order[i], w):
            if total > 0 and x / total > 0.01:
                groups[names[j]].add([i], float(x / total), "REPLACE")
    o.parent = rig
    o.modifiers.new("rig", "ARMATURE").object = rig


# ---------------------------------------------------------------- moves


def rx(a):
    return Quaternion((1, 0, 0), a)


def ry(a):
    return Quaternion((0, 1, 0), a)


def rz(a):
    return Quaternion((0, 0, 1), a)


def smooth(u):
    return u * u * (3 - 2 * u)


class Poser:
    def __init__(self, rig, bones, legs, spec):
        self.rig, self.bones, self.legs, self.spec = rig, bones, legs, spec
        self.J = {n: Vector(b[0]) for n, b in bones.items()}
        self.parent = {n: b[2] for n, b in bones.items()}
        self.rest = {n: rig.data.bones[n].matrix_local.to_quaternion() for n in bones}
        self.q = {}
        self.lift = Vector((0, 0, 0))
        self.neutral = {}
        for pair in (("fl", "fr"), ("hl", "hr")):
            y = sum(float(legs[l]["sole"][1]) for l in pair) / 2
            for l in pair:
                self.neutral[l] = y

    def fk(self, bone, p):
        while bone:
            q = self.q.get(bone)
            if q is not None:
                p = self.J[bone] + q @ (p - self.J[bone])
            bone = self.parent[bone]
        return p + self.lift

    def set_leg(self, leg, foot_y, foot_z, flex):
        c = self.legs[leg]
        host = self.parent[f"{leg}_up"]
        pitch = self.pitch_of(host)
        hip = self.fk(host, Vector(c["hip"]))
        off = Vector(c["ankle"]) - Vector(c["sole"])
        ty, tz = foot_y + off.y, foot_z + off.z
        H, K, A = c["hip"], c["knee"], c["ankle"]
        l1 = math.hypot(K[1] - H[1], K[2] - H[2])
        l2 = math.hypot(A[1] - K[1], A[2] - K[2])
        dy, dz = ty - hip.y, tz - hip.z
        d = max(min(math.hypot(dy, dz), (l1 + l2) * 0.999), abs(l1 - l2) + 1e-3)
        base = math.atan2(dz, dy)
        a = math.acos(max(-1, min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
        rest1 = math.atan2(K[2] - H[2], K[1] - H[1])
        rest2 = math.atan2(A[2] - K[2], A[1] - K[1])
        # A leg that is nearly straight at rest could fold either way. Knees always point forward (-Y).
        wrap = lambda x: math.atan2(math.sin(x), math.cos(x))
        up = min((base + a, base - a), key=lambda x: math.cos(x))
        kx, kz = hip.y + l1 * math.cos(up), hip.z + l1 * math.sin(up)
        low = math.atan2(tz - kz, ty - kx)
        d1, d2 = wrap(up - rest1), wrap(low - rest2)
        self.q[f"{leg}_up"] = rx(d1 - pitch)
        self.q[f"{leg}_low"] = rx(d2 - d1)
        # A wide foot rolls with the leg rather than shearing against it.
        self.q[f"{leg}_foot"] = rx(flex + d2 * float(self.spec.get("foot_follow", 0.0)) - d2)

    def pitch_of(self, bone):
        total = 0.0
        while bone:
            total += self.pitches.get(bone, 0.0)
            bone = self.parent[bone]
        return total

    def begin(self, lift=0.0, pitch=0.0, roll=0.0):
        self.q = {}
        self.pitches = {"body": pitch}
        self.lift = Vector((0, 0, lift))
        self.q["body"] = rx(pitch) @ ry(roll)

    def bone(self, name, a=0.0, b=0.0, c=0.0):
        if name not in self.J:
            return
        self.pitches[name] = a
        self.q[name] = rx(a) @ ry(b) @ rz(c)

    def key(self, frame):
        rig = self.rig
        for n, q in self.q.items():
            pb = rig.pose.bones[n]
            r = self.rest[n]
            pb.rotation_quaternion = r.inverted() @ q @ r
            pb.keyframe_insert("rotation_quaternion", frame=frame)
        root = rig.pose.bones["root"]
        root.location = self.rest["root"].inverted() @ self.lift
        root.keyframe_insert("location", frame=frame)


def foot_on_path(p, leg, phase, g):
    """Where a foot is at this point in the cycle: planted and moving back, or swinging forward."""
    u = (phase + g["phase"][leg]) % 1.0
    length = g["stride"] * g["duty"]
    y0 = p.neutral[leg]
    sole = float(p.legs[leg]["sole"][2])
    if u < g["duty"]:
        k = u / g["duty"]
        return y0 - length / 2 + length * k, sole, 0.0
    k = (u - g["duty"]) / (1 - g["duty"])
    return y0 + length / 2 - length * smooth(k), sole + g["lift"] * math.sin(math.pi * k), -g.get("flex", 0.5) * math.sin(math.pi * k)


def pose_at(p, spec, clip, phase):
    t = math.tau * phase
    m = spec["moves"]
    if clip == "idle":
        g = m["idle"]
        p.begin(lift=g.get("breath", 0.006) * math.sin(t), pitch=0.004 * math.sin(t))
        p.bone("spine", 0.006 * math.sin(t))
        p.bone("chest", -0.006 * math.sin(t))
        p.bone("neck", g.get("nod", 0.03) * math.sin(t + 0.6), c=g.get("look", 0.04) * math.sin(t * 2))
        p.bone("head", -g.get("nod", 0.03) * 0.6 * math.sin(t + 1.1), c=g.get("look", 0.04) * 0.7 * math.sin(t * 2 + 0.5))
        for leg in LEGS:
            s = p.legs[leg]["sole"]
            p.set_leg(leg, float(s[1]), float(s[2]), 0.0)
    else:
        g = m[clip]
        bob = g["bob"] * math.sin(2 * t + g.get("bob_at", 0.4))
        if g.get("rock"):
            bob = g["bob"] * math.sin(t + 1.2)
        pitch = g.get("rock", 0.0) * math.sin(t + 0.3)
        roll = g.get("roll", 0.0) * math.sin(t)
        p.begin(lift=bob, pitch=pitch, roll=roll)
        p.bone("spine", -pitch * 0.25 + g.get("flex_spine", 0.0) * math.sin(t))
        p.bone("chest", -pitch * 0.25, c=g.get("yaw", 0.012) * math.sin(t))
        p.bone("neck", g.get("nod", 0.05) * math.sin(2 * t + 0.9) - pitch * 0.4, c=g.get("yaw", 0.012) * math.sin(t + 0.5))
        p.bone("head", -g.get("nod", 0.05) * 0.5 * math.sin(2 * t + 1.4))
        for leg in LEGS:
            y, z, flex = foot_on_path(p, leg, phase, g)
            p.set_leg(leg, y, z, flex)
    # Tail, and whatever else the animal has.
    swish = m.get("tail", 0.14) * (1.0 if clip != "run" else 0.7)
    for i in range(1, 4):
        p.bone(f"tail{i}", 0.05 * math.sin(t + i * 0.9) * (clip == "run"), c=swish * math.sin(t - i * 0.7))
    if "trunk1" in p.J:
        amp = m.get("trunk", 0.1)
        for i in range(1, 5):
            p.bone(f"trunk{i}", amp * 0.8 * math.sin(t + i * 0.5), c=amp * math.sin(t - i * 0.6))
        fan = m.get("flap", 0.14)
        p.bone("flap_l", c=fan * (0.5 + 0.5 * math.sin(t)))
        p.bone("flap_r", c=-fan * (0.5 + 0.5 * math.sin(t + 0.4)))


def make_clips(p, spec):
    clips = {}
    strides = {}
    rig = p.rig
    rig.animation_data_create()
    for name, g in spec["moves"].items():
        if not isinstance(g, dict) or "seconds" not in g:
            continue
        action = bpy.data.actions.new(name)
        rig.animation_data.action = action
        frames = max(8, round(g["seconds"] * FPS))
        for f in range(frames + 1):
            pose_at(p, spec, name, (f % frames) / frames)
            p.key(f + 1)
        clips[name] = action
        if "stride" in g:
            strides[name] = round(g["stride"] / (frames / FPS), 3)
    rig.animation_data.action = None
    for b in rig.pose.bones:
        b.rotation_quaternion = Quaternion()
        b.location = Vector()
    for name, action in clips.items():
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        strip = track.strips.new(name, 1, action)
        strip.action_frame_end = action.frame_range[1]
    return clips, strides


# ---------------------------------------------------------------- output and check renders


def export(rig, o, file):
    os.makedirs(os.path.dirname(file), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=file,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_step=1,
        export_skins=True,
        export_all_influences=False,
        export_def_bones=False,
        export_morph=False,
        export_tangents=False,
        export_image_format="JPEG",
        export_jpeg_quality=92,
    )


def renders(rig, o, spec, clips, folder):
    os.makedirs(folder, exist_ok=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = 10
    scn.cycles.use_denoising = False
    scn.render.resolution_x, scn.render.resolution_y = 520, 400
    w = bpy.data.worlds.new("w")
    scn.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.75, 0.75, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.3
    cam = bpy.data.cameras.new("c")
    ob = bpy.data.objects.new("c", cam)
    scn.collection.objects.link(ob)
    scn.camera = ob
    cam.lens = 50
    co = verts_of(o)
    size = float(np.ptp(co, axis=0).max())
    c = Vector((0, 0, float(co[:, 2].max()) / 2))
    ob.location = c + Vector((size * 2.1, 0, size * 0.2))
    ob.rotation_euler = (c - ob.location).to_track_quat("-Z", "Y").to_euler()
    for name, action in clips.items():
        rig.animation_data.action = action
        for tr in rig.animation_data.nla_tracks:
            tr.mute = True
        a, b = action.frame_range
        for k in (0.0, 0.25, 0.5, 0.75):
            scn.frame_set(int(a + (b - a) * k))
            scn.render.filepath = os.path.join(folder, f"{name}_{int(k * 100):02d}.png")
            bpy.ops.render.render(write_still=True)


def main():
    a = args()
    spec = json.loads(open(a.spec, encoding="utf-8").read())
    o = load_mesh(spec)
    to_model = prepare(o, spec)
    co = verts_of(o)
    bones, legs = build_bones(spec, to_model, co, o)
    rig = make_armature(bones)
    bind(o, rig, bones, spec, to_model, legs)
    p = Poser(rig, bones, legs, spec)
    clips, strides = make_clips(p, spec)
    tris = sum(len(q.vertices) - 2 for q in o.data.polygons)
    lo, hi = co.min(axis=0), co.max(axis=0)
    info = {
        "id": spec["id"],
        "tris": tris,
        "bones": len(bones),
        "strides": strides,
        "size_m": [round(float(x), 3) for x in hi - lo],
        "half": [round(float(max(-lo[0], hi[0])), 3), round(float(max(-lo[1], hi[1])), 3)],
        "seat_m": [round(float(x), 3) for x in to_model(spec["seat"])],
        "clips": list(clips),
        "legs": {l: {k: [round(float(x), 2) for x in v] for k, v in c.items()} for l, c in legs.items()},
    }
    export(rig, o, spec["out"])
    with open(os.path.splitext(spec["out"])[0] + ".json", "w", encoding="utf-8") as f:
        json.dump(info, f, indent=1)
    if a.debug:
        renders(rig, o, spec, clips, a.debug)
    print("RIG_DONE", json.dumps(info))


main()
