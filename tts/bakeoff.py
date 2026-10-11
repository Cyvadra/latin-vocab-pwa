"""Voice the same forms through phoneme-driven engines (Piper, Kokoro) for a listening comparison.

Usage: python tts/bakeoff.py FORMS.tsv OUTDIR   (TSV: key, form)
Writes OUTDIR/<engine>/<key>.wav.
"""
import sys, types
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, str(Path(__file__).parent))
from audio_utils import trim_and_polish
from latin_ipa import word_ipa

rows = [l.split("\t")[:2] for l in Path(sys.argv[1]).read_text().splitlines() if l]
out = Path(sys.argv[2])

only = sys.argv[3] if len(sys.argv) > 3 else None

# ---- Piper: phonemes straight into the Italian voices
from piper import PiperVoice, SynthesisConfig

for name in [] if only == "kokoro" else ["serena", "paola"]:
    voice = PiperVoice.load(f"tts/cache/piper/it_IT-{name}-medium.onnx")
    cfg = SynthesisConfig(length_scale=1.5, noise_scale=0.4, noise_w_scale=0.5)
    d = out / f"piper-{name}"; d.mkdir(parents=True, exist_ok=True)
    for key, form in rows:
        ids = voice.phonemes_to_ids(list(word_ipa(form)))
        wav = voice.phoneme_ids_to_audio(ids, cfg)
        sf.write(d / f"{key}.wav", trim_and_polish(wav, voice.config.sample_rate), voice.config.sample_rate)
    print("piper", name, "done", flush=True)

# ---- Kokoro: its G2P (misaki) isn't needed, so stub it out
from transformers import AlbertModel  # noqa: F401 — import before the stubs, which confuse transformers' lazy loader
for m in ["misaki", "misaki.en", "misaki.espeak"]:
    stub = types.ModuleType(m)
    stub.__getattr__ = lambda name: type(name, (), {})  # any attribute (en.MToken…) resolves to a dummy class
    sys.modules.setdefault(m, stub)
sys.modules["misaki"].en = sys.modules["misaki.en"]
sys.modules["misaki"].espeak = sys.modules["misaki.espeak"]
from huggingface_hub import hf_hub_download
from kokoro.model import KModel

REPO = "hexgrad/Kokoro-82M"
model = KModel(repo_id=REPO).to("cuda").eval()
for vname in ["if_sara", "im_nicola", "em_alex"]:
    pack = torch.load(hf_hub_download(REPO, f"voices/{vname}.pt"), weights_only=True).to("cuda")
    d = out / f"kokoro-{vname}"; d.mkdir(parents=True, exist_ok=True)
    for key, form in rows:
        ps = word_ipa(form).replace("g", "ɡ")  # Kokoro's vocabulary uses the IPA g
        with torch.no_grad():
            wav = model(ps, pack[len(ps) - 1], speed=0.85).cpu().numpy()
        sf.write(d / f"{key}.wav", trim_and_polish(wav, 24000), 24000)
    print("kokoro", vname, "done", flush=True)
