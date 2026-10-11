"""Generate classical-pronunciation audio for every word with best-of-N seed selection.

With --sentences, voices the example sentences instead (tts/out/classical/s/{word_id}.wav).

Each candidate is transcribed by a Latin Whisper model; the candidate whose transcript is
closest to the target wins. Output: tts/out/classical/{word_id}.wav and report.json.
"""
import argparse, difflib, json, sqlite3, sys, time
from pathlib import Path

import numpy as np
import soundfile as sf
from transformers import pipeline

sys.path.insert(0, str(Path(__file__).parent))
from audio_utils import trim_and_polish
from latin_tts import LatinTTS, normalize

ap = argparse.ArgumentParser()
ap.add_argument("--limit", type=int, default=0)
ap.add_argument("--seeds", type=int, default=6)
ap.add_argument("--batch", type=int, default=8, help="items per GPU batch (each with --seeds takes)")
ap.add_argument("--noise", type=float, default=0.3)
ap.add_argument("--out", default="tts/out/classical")
ap.add_argument("--redo", action="store_true")
ap.add_argument("--ids", help="comma-separated word ids to (re)generate")
ap.add_argument("--sentences", action="store_true", help="voice example sentences instead of words")
ap.add_argument("--forms", help="voice inflected forms from this TSV (key, form) into <out>/f/{key}.wav")
ap.add_argument("--offset", type=int, default=0, help="with --forms: skip this many rows (to split a run across workers)")
args = ap.parse_args()

out = Path(args.out) / ("s" if args.sentences else "f" if args.forms else ""); out.mkdir(parents=True, exist_ok=True)
db = sqlite3.connect("data/latin.db")
if args.forms:
    pairs = (l.split("\t")[:2] for l in Path(args.forms).read_text().splitlines() if l)
    rows = [(k, f, f) for k, f in pairs][args.offset:]
elif args.sentences:
    rows = db.execute("select s.word_id, s.la, '' from sentences s join words w on w.id = s.word_id order by w.freq_rank").fetchall()
else:
    rows = db.execute("select id, lemma, headword from words order by freq_rank, id").fetchall()
if args.limit: rows = rows[: args.limit]
only = {int(x) for x in args.ids.split(",")} if args.ids else None
if only: rows = [r for r in rows if r[0] in only]

tts = LatinTTS(noise_scale=args.noise)
asr = pipeline("automatic-speech-recognition", model="Ken-Z/latin_whisper-small", device=0)
report_path = out / "report.json"
report = json.loads(report_path.read_text()) if report_path.exists() else {}

def expected_trimmed_dur(letters: int) -> float:
    """Median trimmed duration of this voice for an n-letter word (fitted on the first full run)."""
    return 0.50 + 0.07 * letters


def spoken_text(lemma: str, headword: str) -> str:
    t = normalize(lemma)
    if args.sentences:
        return t
    # The model needs a couple of letters of context; for 1-letter words say the listed variants.
    if len(t) < 2:
        t = normalize(" ".join(w for w in headword.split() if not w.startswith("-")))
    return t

def score_take(wav, got: str, target: str) -> dict:
    got_n = normalize(got).replace(" ", "")
    sim = difflib.SequenceMatcher(None, target, got_n).ratio()
    trimmed = len(trim_and_polish(wav, tts.sr)) / tts.sr - 0.24
    # duration model was fitted on isolated words
    slow = 1.0 if args.sentences else trimmed / expected_trimmed_dur(len(target))
    score = sim - 0.8 * max(0.0, slow - 1.3) - (0.3 if trimmed < 0.2 else 0)
    return dict(sim=round(sim, 3), score=round(score, 3), dur=round(len(wav) / tts.sr, 2), asr=got_n, wav=wav)


# skip finished items, unless the text changed (e.g. an edited example sentence)
todo = []
for wid, lemma, hw in rows:
    text = spoken_text(lemma, hw)
    if report.get(str(wid), {}).get("text") == text and (out / f"{wid}.wav").exists() and not args.redo and not only:
        continue
    todo.append((wid, text))

# Batched on the GPU: --batch items x --seeds takes per VITS call, all takes checked by Whisper together.
t0 = time.time()
for b in range(0, len(todo), args.batch):
    chunk = todo[b : b + args.batch]
    takes = tts.synth_batch([t for _, t in chunk], args.seeds, seed=b)
    flat = [w for ws in takes for w in ws]
    heard = asr(
        [{"raw": w, "sampling_rate": tts.sr} for w in flat],
        batch_size=len(flat) or 1,
        generate_kwargs={"max_new_tokens": 80 if args.sentences else 10, "num_beams": 1},
    ) if flat else []
    k = 0
    for (wid, text), ws in zip(chunk, takes):
        target = text.replace(" ", "")
        cands = []
        for seed, w in enumerate(ws):
            cands.append(dict(seed=seed, **score_take(w, heard[k]["text"], target)))
            k += 1
        if not cands:
            report[str(wid)] = dict(text=text, error="synthesis failed")
            continue
        best = max(cands, key=lambda c: c["score"])
        sf.write(out / f"{wid}.wav", trim_and_polish(best.pop("wav"), tts.sr), tts.sr)
        report[str(wid)] = dict(text=text, **best)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=0))
    print(f"{b + len(chunk)}/{len(todo)} {time.time()-t0:.0f}s", flush=True)
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=0))
sims = [r["sim"] for r in report.values() if "sim" in r]
print("done", len(sims), "mean sim", round(float(np.mean(sims)), 3), "exact", sum(s == 1.0 for s in sims))
