"""Line protocol shared by the engine workers.

render.py starts one worker per run and keeps it alive. One JSON object per line:

  worker -> parent   {"ready": true, "sr": 24000, ...}            once, after the model has loaded
  parent -> worker   {"text": "...", "speed": 1.0, "out": "x.wav", "seed": 1, ...}
  worker -> parent   {"ok": true, "phonemes": "..."}  or  {"ok": false, "error": "..."}
  parent -> worker   {"cmd": "quit"}

Libraries print to stdout while loading, so the real stdout is kept for the protocol and
everything else is sent to stderr (render.py writes that to a log file).

CPU only. The GPU is never used: CUDA is hidden before any library is imported.
"""
import json
import os
import sys
import traceback

os.environ["CUDA_VISIBLE_DEVICES"] = ""


def serve(load, synth):
    proto = os.fdopen(os.dup(1), "w", encoding="utf-8", newline="\n")
    os.dup2(2, 1)
    sys.stdout = sys.stderr

    def send(obj):
        proto.write(json.dumps(obj, ensure_ascii=False) + "\n")
        proto.flush()

    try:
        info = load() or {}
    except Exception:
        send({"ready": False, "error": traceback.format_exc()})
        sys.exit(1)
    send({"ready": True, **info})

    stdin = open(0, "r", encoding="utf-8", closefd=False)
    for line in stdin:
        line = line.strip()
        if not line:
            continue
        req = json.loads(line)
        if req.get("cmd") == "quit":
            break
        try:
            send({"ok": True, **(synth(req) or {})})
        except Exception:
            send({"ok": False, "error": traceback.format_exc()})
