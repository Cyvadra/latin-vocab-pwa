"""Generate ecclesiastical-pronunciation audio: Latin -> Italian respelling -> Piper Italian voice.

Output: tts/out/ecclesiastical/{word_id}.wav and report.json (with an ASR agreement score).
"""
import argparse, difflib, json, sqlite3, sys, unicodedata
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

sys.path.insert(0, str(Path(__file__).parent))
from audio_utils import trim_and_polish
from ecclesiastical import respell
from piper import PiperVoice, SynthesisConfig

ap = argparse.ArgumentParser()
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--voice", default="tts/cache/piper/it_IT-serena-medium.onnx")
ap.add_argument("--out", default="tts/out/ecclesiastical")
ap.add_argument("--no-asr", action="store_true")
args = ap.parse_args()

out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
db = sqlite3.connect("data/latin.db")
rows = db.execute("select id, lemma, headword from words order by freq_rank, id").fetchall()
if args.limit: rows = rows[: args.limit]

voice = PiperVoice.load(args.voice)
cfg = SynthesisConfig(length_scale=1.25, noise_scale=0.4, noise_w_scale=0.5)
asr = None
if not args.no_asr:
    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model="openai/whisper-small", device=0)

def plain(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if c.isalpha() and unicodedata.category(c) != "Mn")

report = {}
for n, (wid, lemma, hw) in enumerate(rows, 1):
    # one-letter lemmas (ā, ē) are unspeakable alone: say the listed variants ("ā ab abs")
    source = lemma if len(plain(lemma)) > 1 else " ".join(w for w in hw.split() if not w.startswith("-"))
    text = respell(source)
    chunks = [c.audio_float_array for c in voice.synthesize(text, cfg)]
    wav = np.concatenate(chunks)
    sr = voice.config.sample_rate
    sf.write(out / f"{wid}.wav", trim_and_polish(wav, sr), sr)
    entry = dict(text=text, dur=round(len(wav) / sr, 2))
    if asr:
        pcm = sf.read(out / f"{wid}.wav")[0].astype(np.float32)
        pcm16 = resample_poly(pcm, 16000, sr).astype(np.float32)
        res = asr({"raw": pcm16, "sampling_rate": 16000}, generate_kwargs={"language": "it", "task": "transcribe", "max_new_tokens": 12})
        entry["asr"] = plain(res["text"])
        entry["sim"] = round(difflib.SequenceMatcher(None, plain(text), entry["asr"]).ratio(), 3)
    report[str(wid)] = entry
    if n % 50 == 0:
        print(f"{n}/{len(rows)}", flush=True)
(out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=0))
sims = [r["sim"] for r in report.values() if "sim" in r]
if sims: print("done mean sim", round(float(np.mean(sims)), 3), "exact", sum(s == 1.0 for s in sims), "/", len(sims))
