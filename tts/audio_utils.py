import numpy as np


def trim_and_polish(wav: np.ndarray, sr: int, pad_ms: int = 120, thresh_db: float = -42.0) -> np.ndarray:
    """Trim leading/trailing silence, add short padding, fade edges, normalise peak to -3 dBFS."""
    wav = wav.astype(np.float32)
    peak = float(np.abs(wav).max()) or 1.0
    thresh = peak * (10 ** (thresh_db / 20))
    idx = np.where(np.abs(wav) > thresh)[0]
    if len(idx) == 0:
        return wav
    wav = wav[idx[0] : idx[-1] + 1]
    fade = int(0.012 * sr)
    if len(wav) > 2 * fade:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        wav[:fade] *= ramp
        wav[-fade:] *= ramp[::-1]
    pad = np.zeros(int(pad_ms / 1000 * sr), dtype=np.float32)
    wav = np.concatenate([pad, wav, pad])
    wav *= (10 ** (-3 / 20)) / (np.abs(wav).max() or 1.0)
    return wav
