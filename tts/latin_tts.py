"""Latin TTS wrapper around Ken-Z/latin_SpeechT5 (a VITS model trained on Vox Classica)."""
import re
import unicodedata

import numpy as np
import torch
from transformers import VitsModel, VitsTokenizer, set_seed

MODEL_ID = "Ken-Z/latin_SpeechT5"


def strip_macrons(s: str) -> str:
    """ō -> o, ī -> i ... The model's vocabulary has no macron letters (it drops them)."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return unicodedata.normalize("NFC", s)


def normalize(text: str) -> str:
    text = strip_macrons(text).lower()
    text = re.sub(r"[^a-z ]+", " ", text)  # drop punctuation, hyphens, digits
    return re.sub(r"\s+", " ", text).strip()


class LatinTTS:
    def __init__(self, device: str = "cuda", noise_scale: float = 0.667, speaking_rate: float = 1.0):
        self.device = device
        self.tok = VitsTokenizer.from_pretrained(MODEL_ID)
        self.model = VitsModel.from_pretrained(MODEL_ID).to(device).eval()
        self.model.noise_scale = noise_scale
        self.model.speaking_rate = speaking_rate
        self.sr = self.model.config.sampling_rate

    def synth(self, text: str, seed: int = 555) -> np.ndarray:
        ids = self.tok(text, return_tensors="pt")
        if ids["input_ids"].shape[1] < 5:
            raise ValueError(f"text too short for model: {text!r}")
        set_seed(seed)
        with torch.no_grad():
            wav = self.model(**{k: v.to(self.device) for k, v in ids.items()}).waveform[0]
        return wav.float().cpu().numpy()
