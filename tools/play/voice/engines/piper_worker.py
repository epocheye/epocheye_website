"""Piper worker (piper-tts, GPL-3.0-or-later tool; voices from rhasspy/piper-voices). CPU only.
Runs in .venv. The voice's own licence is recorded per voice in LICENSES.md."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _proto import serve  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--model", required=True)   # path to <voice>.onnx (its .onnx.json sits beside it)
args = ap.parse_args()

state = {}


def load():
    from piper import PiperVoice
    voice = PiperVoice.load(args.model, use_cuda=False)
    state["voice"] = voice
    return {"sr": int(voice.config.sample_rate), "engine": "piper", "device": "cpu"}


def synth(req):
    import numpy as np
    import soundfile as sf
    from piper import SynthesisConfig
    voice = state["voice"]
    np.random.seed(int(req.get("seed", 0)) % (2 ** 32))
    cfg = SynthesisConfig(length_scale=1.0 / float(req.get("speed", 1.0)), normalize_audio=False)
    chunks = list(voice.synthesize(req["text"], syn_config=cfg))
    wav = np.concatenate([c.audio_float_array for c in chunks]).astype(np.float32)
    sf.write(req["out"], wav, voice.config.sample_rate, subtype="FLOAT")
    phonemes = " | ".join("".join(s) for s in voice.phonemize(req["text"]))
    return {"phonemes": phonemes}


serve(load, synth)
