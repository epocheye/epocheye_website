"""Retargets the CC0 Quaternius Universal Animation Library onto the MPFB townspeople.

  blender -b --factory-startup --python tools/play/blender/retarget_cc0.py -- \
      --world tools/play/worlds/<slug>.json [--only id,id] [--report <file.json>]

Reads the figure GLBs named in the world config's "actors" block and the library GLB. Both are only
read. Writes one small JSON of clip data per figure to tools/play/assets/cc0/people/, which
tools/play/pack_actors.mjs puts on the figure in place of whatever clips the source GLB carries.
Nothing here uses the GPU, and nothing is saved to a .blend.

The method is the one in the palace project's retarget_mocap.py. Each mapped bone gets one constant
offset K from a calibration pose, and on every frame

    target world rotation = source world rotation @ K

Limbs are calibrated by aim: the target bone is turned, by the smallest rotation, to point where the
source bone points in the source's rest (the library is a T-pose, the MPFB rest is arms down and
legs apart). The trunk, head, clavicles and feet keep their own rest and only take the source's
change from its rest, because their rest shapes differ between the rigs and aiming them would bend
the spine or tip the feet. Bones with no mapping stay at rest relative to their parent.

The whole figure is then moved up or down, frame by frame, so the lowest point of the sole mesh
stays on the ground. Bodies differ in leg length, so this is per figure. Walks stay in place.
"""
import json, math, struct, sys
from pathlib import Path

import numpy as np
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[3]
LIBRARY = ROOT / "tools/play/assets/cc0/universal-animation-library/AnimationLibrary_Godot_Standard.glb"
OUT = ROOT / "tools/play/assets/cc0/people"
FPS = 30
CLIPS = {"walk": "Walk_Loop", "idle": "Idle_Loop", "talk": "Idle_Talking_Loop"}
# The library's arms hang wide of its slim mannequin. These figures wear wide clothes, so a walking
# or standing arm is brought in by this many degrees about the figure's front-back axis. The talking
# gesture is left as it is: its hands are already in front of the body.
ARMS_IN_DEG = {"walk": 10.0, "idle": 10.0, "talk": 0.0}

# Source joint -> target joint. Bones the map skips (spine05, spine02, neck02, the twist halves)
# follow their parent.
SIDES = ("L", "R")
MAP = {"DEF-hips": "root", "DEF-spine.001": "spine04", "DEF-spine.002": "spine03", "DEF-spine.003": "spine01",
       "DEF-neck": "neck01", "DEF-head": "head"}
for s in SIDES:
    MAP.update({f"DEF-shoulder.{s}": f"clavicle.{s}", f"DEF-upper_arm.{s}": f"upperarm01.{s}",
                f"DEF-forearm.{s}": f"lowerarm01.{s}", f"DEF-hand.{s}": f"wrist.{s}",
                f"DEF-thigh.{s}": f"upperleg01.{s}", f"DEF-shin.{s}": f"lowerleg01.{s}", f"DEF-foot.{s}": f"foot.{s}"})

# Aimed bones: (source joint, source child) -> (target joint, target child).
AIM = {}
for s in SIDES:
    AIM[f"DEF-upper_arm.{s}"] = (f"DEF-forearm.{s}", f"lowerarm01.{s}")
    AIM[f"DEF-forearm.{s}"] = (f"DEF-hand.{s}", f"wrist.{s}")
    AIM[f"DEF-hand.{s}"] = (f"DEF-f_middle.01.{s}", f"finger3-1.{s}")
    AIM[f"DEF-thigh.{s}"] = (f"DEF-shin.{s}", f"lowerleg01.{s}")
    AIM[f"DEF-shin.{s}"] = (f"DEF-foot.{s}", f"foot.{s}")

COMPONENT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
NORM = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}


class Glb:
    def __init__(self, path):
        data = Path(path).read_bytes()
        n = struct.unpack_from("<I", data, 12)[0]
        self.g = json.loads(data[20:20 + n])
        size = struct.unpack_from("<I", data, 20 + n)[0]
        self.bin = data[28 + n:28 + n + size]
        self.nodes = self.g["nodes"]
        self.parent = {c: i for i, nd in enumerate(self.nodes) for c in nd.get("children", [])}
        self.joints = self.g["skins"][0]["joints"]
        self.by_name = {self.nodes[j]["name"]: j for j in self.joints}
        self.order = []  # every node, parents first
        seen = set()
        def visit(i):
            if i in seen:
                return
            if i in self.parent:
                visit(self.parent[i])
            seen.add(i)
            self.order.append(i)
        for i in range(len(self.nodes)):
            visit(i)

    def accessor(self, i):
        a = self.g["accessors"][i]
        v = self.g["bufferViews"][a["bufferView"]]
        code, n = COMPONENT[a["componentType"]], COUNT[a["type"]]
        item = struct.calcsize("<" + code)
        stride = v.get("byteStride") or item * n
        start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        out = np.empty((a["count"], n), dtype=np.float64)
        for k in range(a["count"]):
            out[k] = struct.unpack_from("<" + code * n, self.bin, start + k * stride)
        if a.get("normalized") and a["componentType"] in NORM:
            out /= NORM[a["componentType"]]
        return out

    def rest_local(self, i):
        nd = self.nodes[i]
        if "matrix" in nd:
            return Matrix([nd["matrix"][k:k + 4] for k in range(0, 16, 4)]).transposed()
        return trs(nd.get("translation", (0, 0, 0)), nd.get("rotation", (0, 0, 0, 1)), nd.get("scale", (1, 1, 1)))

    def world_rest(self):
        out = {}
        for i in self.order:
            m = self.rest_local(i)
            out[i] = out[self.parent[i]] @ m if i in self.parent else m
        return out

    def clip(self, name):
        a = next(x for x in self.g["animations"] if x["name"] == name)
        tracks = {}
        end = 0.0
        for c in a["channels"]:
            t = c["target"]
            s = a["samplers"][c["sampler"]]
            if s.get("interpolation", "LINEAR") != "LINEAR":
                raise SystemExit(f"{name}: unexpected interpolation {s.get('interpolation')}")
            times = self.accessor(s["input"]).ravel()
            end = max(end, float(times[-1]))
            tracks[(t["node"], t["path"])] = (times, self.accessor(s["output"]))
        return tracks, end


def trs(t, r, s):
    q = Quaternion((r[3], r[0], r[1], r[2])).normalized()
    return Matrix.LocRotScale(Vector(t), q, Vector(s))


def sample(track, t):
    times, values = track
    if t <= times[0]:
        return values[0]
    if t >= times[-1]:
        return values[-1]
    k = int(np.searchsorted(times, t)) - 1
    f = (t - times[k]) / max(times[k + 1] - times[k], 1e-9)
    a, b = values[k], values[k + 1]
    if len(a) == 4:
        if float(np.dot(a, b)) < 0:
            b = -b
        q = a * (1 - f) + b * f
        return q / np.linalg.norm(q)
    return a * (1 - f) + b * f


def source_pose(src, tracks, t):
    """World matrix of every source node at time t."""
    out = {}
    for i in src.order:
        nd = src.nodes[i]
        tr = tracks.get((i, "translation"))
        ro = tracks.get((i, "rotation"))
        sc = tracks.get((i, "scale"))
        m = trs(sample(tr, t) if tr else nd.get("translation", (0, 0, 0)),
                sample(ro, t) if ro else nd.get("rotation", (0, 0, 0, 1)),
                sample(sc, t) if sc else nd.get("scale", (1, 1, 1)))
        out[i] = out[src.parent[i]] @ m if i in src.parent else m
    return out


def rot(m):
    return m.decompose()[1].normalized()


def sole_samples(fig, foot_prefix):
    """Rest-pose vertices of one foot, from the body mesh. Used to measure ground contact."""
    wanted = {i for i, j in enumerate(fig.joints) if fig.nodes[j]["name"] == f"foot.{foot_prefix}"
              or fig.nodes[j]["name"].startswith("toe") and fig.nodes[j]["name"].endswith(f".{foot_prefix}")}
    pts = []
    for nd in fig.nodes:
        if "mesh" not in nd or "skin" not in nd:
            continue
        for p in fig.g["meshes"][nd["mesh"]]["primitives"]:
            at = p["attributes"]
            if "JOINTS_0" not in at or "WEIGHTS_0" not in at:
                continue
            mat = fig.g["materials"][p["material"]].get("name", "") if "material" in p else ""
            if "body" not in mat.lower() and "high-poly" not in mat.lower():
                continue
            pos, jo, we = fig.accessor(at["POSITION"]), fig.accessor(at["JOINTS_0"]), fig.accessor(at["WEIGHTS_0"])
            for v in range(len(pos)):
                w = sum(float(we[v][k]) for k in range(4) if int(jo[v][k]) in wanted)
                if w > 0.6:
                    pts.append(pos[v])
    if not pts:
        raise SystemExit(f"No sole vertices found for foot {foot_prefix}")
    pts = np.array(pts)
    # The lowest fifth of the foot is what can touch the ground.
    cut = np.quantile(pts[:, 1], 0.2)
    low = pts[pts[:, 1] <= cut]
    step = max(1, len(low) // 160)
    return low[::step]


def periodic_smooth(values, passes=2):
    """Box filter over a loop whose last frame repeats the first."""
    v = np.array(values[:-1], dtype=np.float64)
    for _ in range(passes):
        v = (np.roll(v, 1) + v + np.roll(v, -1)) / 3
    return np.append(v, v[0])


def retarget(src, world_s0, fig, out_name, K, report):
    clip_name = CLIPS[out_name]
    world_t0 = fig.world_rest()
    tracks, end = src.clip(clip_name)
    n = int(round(end * FPS))
    target = [i for i in fig.order if i in set(fig.joints)]
    inv = {fig.by_name[t]: fig_s for fig_s, t in MAP.items()}
    root = fig.by_name["root"]
    root_parent = fig.parent.get(root)
    parent_world = world_t0[root_parent] if root_parent is not None else Matrix.Identity(4)
    src_hips = src.by_name["DEF-hips"]
    hips0 = world_s0[src_hips].translation.copy()
    tgt_hips0 = world_t0[root].translation.copy()
    scale = tgt_hips0.y / hips0.y
    rest_local = {i: fig.rest_local(i) for i in target}
    rest_rot = {i: rot(rest_local[i]) for i in target}

    first = source_pose(src, tracks, 0.0)[src_hips].translation
    last = source_pose(src, tracks, end)[src_hips].translation
    drift = last - first
    drift.y = 0

    soles = {s: sole_samples(fig, s) for s in SIDES}
    foot_rest_inv = {s: np.array(world_t0[fig.by_name[f"foot.{s}"]].inverted()) for s in SIDES}
    ground0 = min(float(p[:, 1].min()) for p in soles.values())

    # Left arm is on +X, so it comes in with a negative turn about +Z.
    angle = math.radians(ARMS_IN_DEG[out_name])
    arms_in = {}
    for side, sign in (("L", -1), ("R", 1)):
        turn = Quaternion(Vector((0, 0, 1)), sign * angle)
        for bone in (f"DEF-upper_arm.{side}", f"DEF-forearm.{side}", f"DEF-hand.{side}"):
            arms_in[bone] = turn

    frames = []
    heights = {s: [] for s in SIDES}
    for f in range(n + 1):
        t = min(f / FPS, end)
        pose = source_pose(src, tracks, t)
        hp = pose[src_hips].translation - drift * (f / max(n, 1))
        root_world = tgt_hips0 + (hp - hips0) * scale
        q_world, m_world, local_q = {}, {}, {}
        for i in target:
            p = fig.parent.get(i)
            q_p = q_world.get(p) if p in q_world else (rot(world_t0[p]) if p is not None else Quaternion())
            if i in inv:
                q = rot(pose[src.by_name[inv[i]]]) @ K[inv[i]]
                if inv[i] in arms_in:
                    q = arms_in[inv[i]] @ q
            else:
                q = q_p @ rest_rot[i]
            q_world[i] = q
            local_q[i] = q_p.inverted() @ q
            lt, _, ls = rest_local[i].decompose()
            if i == root:
                lt = parent_world.inverted() @ root_world
            lm = Matrix.LocRotScale(lt, local_q[i], ls)
            pm = m_world.get(p) if p in m_world else (world_t0[p] if p is not None else Matrix.Identity(4))
            m_world[i] = pm @ lm
        for s in SIDES:
            m = np.array(m_world[fig.by_name[f"foot.{s}"]]) @ foot_rest_inv[s]
            pts = soles[s]
            heights[s].append(float((m[1, :3] @ pts.T + m[1, 3]).min()))
        frames.append((local_q, root_world.copy()))

    # Keep the lower sole on the ground, frame by frame.
    low = np.minimum(heights["L"], heights["R"])
    lift = periodic_smooth(ground0 - low)
    p_inv = parent_world.inverted()

    out = []
    for joint in [i for i in target if i in inv]:
        vals, prev = [], None
        for fr in frames:
            q = fr[0][joint]
            if prev is not None and q.dot(prev) < 0:
                q = -q
            prev = q
            vals.extend(round(v, 5) for v in (q.x, q.y, q.z, q.w))
        # The loop closes on the first key, on the same side of the quaternion double cover.
        sign = 1 if sum(a * b for a, b in zip(vals[-4:], vals[:4])) >= 0 else -1
        vals[-4:] = [sign * v for v in vals[:4]]
        out.append({"joint": fig.nodes[joint]["name"], "path": "rotation", "values": vals})
    vals = []
    for k, fr in enumerate(frames):
        w = fr[1] + Vector((0, float(lift[k]), 0))
        l = p_inv @ w
        vals.extend(round(v, 4) for v in (l.x, l.y, l.z))
    vals[-3:] = vals[:3]
    out.append({"joint": "root", "path": "translation", "values": vals})

    h_l = np.array(heights["L"]) + lift - ground0
    h_r = np.array(heights["R"]) + lift - ground0
    report[clip_name] = {
        "frames": n + 1, "duration": round(n / FPS, 4),
        "sole_above_ground_cm": {
            "L": [round(float(x) * 100, 1) for x in h_l], "R": [round(float(x) * 100, 1) for x in h_r],
            "lowest_foot_max": round(float(np.minimum(h_l, h_r).max()) * 100, 2),
            "lowest_foot_min": round(float(np.minimum(h_l, h_r).min()) * 100, 2),
        },
        "lift_cm": [round(float(lift.min()) * 100, 1), round(float(lift.max()) * 100, 1)],
    }
    return {"source": clip_name, "frames": n + 1, "duration": round(n / FPS, 5), "tracks": out}


def calibrate(src, world_s0, fig):
    world_t0 = fig.world_rest()
    K = {}
    for s, t in MAP.items():
        sm, tm = world_s0[src.by_name[s]], world_t0[fig.by_name[t]]
        calib = rot(tm)
        if s in AIM:
            sc, tc = AIM[s]
            s_dir = (world_s0[src.by_name[sc]].translation - sm.translation).normalized()
            t_dir = (world_t0[fig.by_name[tc]].translation - tm.translation).normalized()
            calib = t_dir.rotation_difference(s_dir) @ calib
        K[s] = rot(sm).inverted() @ calib
    return K


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    arg = lambda n, d=None: args[args.index(n) + 1] if n in args else d
    world = Path(arg("--world"))
    if not world.is_absolute():
        world = ROOT / world
    only = set(arg("--only").split(",")) if arg("--only") else None
    cfg = json.loads(world.read_text(encoding="utf-8"))
    src = Glb(LIBRARY)
    world_s0 = src.world_rest()
    OUT.mkdir(parents=True, exist_ok=True)
    full = {}
    for a in cfg["actors"]:
        if a.get("kind") != "figure" or (only and a["id"] not in only):
            continue
        fig = Glb(a["src"])
        missing = [t for t in MAP.values() if t not in fig.by_name]
        if missing:
            raise SystemExit(f"{a['id']}: rig lacks {missing}")
        K = calibrate(src, world_s0, fig)
        rep = {}
        clips = {to: retarget(src, world_s0, fig, to, K, rep) for to in CLIPS}
        data = {"figure": a["id"], "fps": FPS, "license": "CC0-1.0",
                "source": "Universal Animation Library (Standard) by Quaternius",
                "made_by": "tools/play/blender/retarget_cc0.py", "clips": clips}
        path = OUT / f"{a['id']}.json"
        path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        full[a["id"]] = rep
        for name, r in rep.items():
            sf = r["sole_above_ground_cm"]
            print(f"@@rt {a['id']} {name} frames {r['frames']} lowest foot {sf['lowest_foot_min']}..{sf['lowest_foot_max']} cm, lift {r['lift_cm']} cm")
        print(f"@@wrote {path} {path.stat().st_size} bytes")
    if arg("--report"):
        Path(arg("--report")).write_text(json.dumps(full), encoding="utf-8")
    print("RETARGET_DONE")


main()
