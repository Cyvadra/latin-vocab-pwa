"""Alternative classical voice: rule-based IPA (latin_ipa.py) read by an Italian Piper voice.

One take per item; vowel length and stress come from the transcription, not the model.
Output: <out>/{word_id}.wav, <out>/s/{word_id}.wav (--sentences), <out>/f/{key}.wav (--forms TSV).
"""
import argparse, re, sqlite3, sys
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from audio_utils import trim_and_polish
from latin_ipa import text_ipa
from piper import PiperVoice, SynthesisConfig

ap = argparse.ArgumentParser()
ap.add_argument("--voice", default="tts/cache/piper/it_IT-paola-medium.onnx")
ap.add_argument("--out", default="tts/out/classical-alt")
ap.add_argument("--sentences", action="store_true")
ap.add_argument("--forms", help="TSV of (key, form)")
ap.add_argument("--redo", action="store_true")
args = ap.parse_args()

out = Path(args.out) / ("s" if args.sentences else "f" if args.forms else ""); out.mkdir(parents=True, exist_ok=True)
if args.forms:
    rows = [l.split("\t")[:2] for l in Path(args.forms).read_text().splitlines() if l]
else:
    db = sqlite3.connect("data/latin.db")
    q = "select word_id, la from sentences" if args.sentences else "select id, lemma from words"
    rows = db.execute(q).fetchall()

voice = PiperVoice.load(args.voice)
cfg = SynthesisConfig(length_scale=1.5, noise_scale=0.4, noise_w_scale=0.5)
sr = voice.config.sample_rate
for n, (key, text) in enumerate(rows, 1):
    dst = out / f"{key}.wav"
    if dst.exists() and not args.redo:
        continue
    ipa = text_ipa(text)
    if args.sentences:
        # keep the punctuation pauses that the word-level transcription drops
        words = iter(ipa.split(" "))
        ipa = re.sub(r"[^\W\d_]+", lambda _: next(words), text)
        ipa = re.sub(r"[;:]", ",", ipa).replace("!", ".").replace("?", ".")
        ipa = re.sub(r"[^\w\sˈːɪʊɛɔŋ,.]", "", ipa)
    sf.write(dst, trim_and_polish(voice.phoneme_ids_to_audio(voice.phonemes_to_ids(list(ipa)), cfg), sr), sr)
    if n % 500 == 0:
        print(f"{n}/{len(rows)}", flush=True)
print("done", len(rows))
