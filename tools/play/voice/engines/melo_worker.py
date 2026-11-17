"""MeloTTS worker (myshell-ai/MeloTTS-English, MIT). CPU only. Runs in .venv-melo.

MeloTTS imports every language at start-up, and its Japanese module needs a 500 MB
dictionary. Only English is used here, so the other language modules are replaced by empty
stand-ins before the import. Nothing in the English path is changed.

Pronunciations from lexicon.json arrive as ARPAbet and are put into MeloTTS's own
pronouncing dictionary for this process only.
"""
import argparse
import re
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _proto import serve  # noqa: E402  (hides CUDA before torch is imported)

ap = argparse.ArgumentParser()
ap.add_argument("--speaker", required=True)  # EN_INDIA, EN-BR, EN-US, EN-AU, EN-Default
args = ap.parse_args()

state = {}


def _distribute_phone(n_phone, n_word):
    # Copied from melo/text/japanese.py (MIT), the one helper the English module borrows.
    per_word = [0] * n_word
    for _ in range(n_phone):
        per_word[per_word.index(min(per_word))] += 1
    return per_word


def _stub_other_languages():
    for name in ("chinese", "japanese", "chinese_mix", "korean", "french", "spanish",
                 "chinese_bert", "japanese_bert", "spanish_bert", "french_bert"):
        mod = types.ModuleType(f"melo.text.{name}")
        mod.get_bert_feature = None
        sys.modules[f"melo.text.{name}"] = mod
    sys.modules["melo.text.japanese"].distribute_phone = _distribute_phone


def load():
    import torch
    assert not torch.cuda.is_available(), "GPU must not be visible"
    _stub_other_languages()
    from melo.api import TTS
    from melo.text import english
    tts = TTS(language="EN", device="cpu")
    state.update(tts=tts, english=english, spk=tts.hps.data.spk2id[args.speaker])
    return {"sr": int(tts.hps.data.sampling_rate), "engine": "melo", "device": "cpu"}


_VOICELESS = {"P", "T", "K", "F", "TH"}
_SIBILANT = {"S", "Z", "SH", "ZH", "CH", "JH"}


def _possessive(phones):
    last = re.sub(r"\d", "", phones[-1])
    if last in _SIBILANT:
        return phones + ["IH0", "Z"]
    return phones + (["S"] if last in _VOICELESS else ["Z"])


def _prepare(text, arpabet):
    """Inject lexicon pronunciations, and keep possessives as one word.

    MeloTTS's tokenizer splits "Sultan's" into "sultan", "'", "s" and would then read the
    lone "s" as the letter. So each "word's" is rewritten to "words" with a dictionary entry
    built from the word's own pronunciation plus the possessive ending.
    """
    english = state["english"]
    d = english.eng_dict
    for word, phones in (arpabet or {}).items():
        d[word.upper()] = [phones.split()]

    def repl(m):
        word = m.group(1)
        key = word.upper()
        if key in d:
            flat = [p for syl in d[key] for p in syl]
        else:
            flat = [p for p in english._g2p(word.lower()) if p.strip()]
        d[key + "S"] = [_possessive(flat)]
        return word + "s"

    return re.sub(r"\b([A-Za-z]+)['’]s\b", repl, text)


def synth(req):
    import torch
    english = state["english"]
    text = _prepare(req["text"], req.get("arpabet"))
    torch.manual_seed(int(req.get("seed", 0)))
    state["tts"].tts_to_file(text, state["spk"], req["out"], speed=float(req.get("speed", 1.0)), quiet=True)
    phones, _tones, _w2p = english.g2p(english.text_normalize(text))
    return {"phonemes": " ".join(phones), "engine_text": text}


serve(load, synth)
