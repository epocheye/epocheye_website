"""Kokoro-82M worker (hexgrad/Kokoro-82M, Apache-2.0). CPU only. Runs in .venv."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _proto import serve  # noqa: E402  (hides CUDA before torch is imported)

ap = argparse.ArgumentParser()
ap.add_argument("--voice", required=True)   # e.g. af_heart
ap.add_argument("--lang", required=True)    # a = American English, b = British English
args = ap.parse_args()

state = {}


def load():
    import torch
    assert not torch.cuda.is_available(), "GPU must not be visible"
    from kokoro import KPipeline
    state["pipe"] = KPipeline(lang_code=args.lang, repo_id="hexgrad/Kokoro-82M", device="cpu")
    state["pipe"].load_voice(args.voice)
    return {"sr": 24000, "engine": "kokoro", "device": "cpu"}


def synth(req):
    import numpy as np
    import soundfile as sf
    audio, phonemes = [], []
    for r in state["pipe"](req["text"], voice=args.voice, speed=float(req.get("speed", 1.0)), split_pattern=None):
        audio.append(r.audio.detach().cpu().numpy() if hasattr(r.audio, "detach") else np.asarray(r.audio))
        phonemes.append(r.phonemes)
    wav = np.concatenate(audio).astype(np.float32)
    sf.write(req["out"], wav, 24000, subtype="FLOAT")
    return {"phonemes": " ".join(phonemes)}


serve(load, synth)
